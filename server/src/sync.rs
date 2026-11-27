//! y-websocket compatible sync endpoint backed by yrs, persisted to `documents.yjs_state`.
use crate::{auth::User, docs, text, AppError, AppState, Res};
use axum::{
    extract::{ws::{Message as Ws, WebSocket, WebSocketUpgrade}, Path, State},
    http::{header, HeaderMap, StatusCode},
    response::Response,
};
use futures_util::{SinkExt, StreamExt};
use std::{
    collections::HashMap,
    sync::{atomic::{AtomicBool, AtomicU64, Ordering}, Arc, Weak},
    time::Duration,
};
use tokio::sync::{broadcast, Mutex};
use uuid::Uuid;
use yrs::{
    sync::{protocol::MSG_AWARENESS, Message, SyncMessage},
    updates::{decoder::Decode, encoder::Encode},
    Doc, ReadTxn, StateVector, Transact, Update,
};

pub struct Room {
    doc: Doc,
    tx: broadcast::Sender<(u64, Arc<Vec<u8>>)>,
    dirty: AtomicBool,
    conns: std::sync::atomic::AtomicUsize,
}

#[derive(Default)]
pub struct Rooms {
    map: Mutex<HashMap<Uuid, Arc<Room>>>,
    next_conn: AtomicU64,
}

async fn persist(s: &AppState, id: Uuid, room: &Room) -> Res<()> {
    let state = room.doc.transact().encode_state_as_update_v1(&StateVector::default());
    let (title, plain) = text::serialize(&room.doc);
    sqlx::query(
        "UPDATE documents SET yjs_state = $2, plain_text_cache = $3, title = COALESCE(NULLIF($4, ''), 'Untitled'), description = $5, updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .bind(state)
    .bind(plain)
    .bind(title)
    .bind(text::meta(&room.doc, "description"))
    .execute(&s.db)
    .await?;
    Ok(())
}

async fn join(s: &AppState, id: Uuid) -> Res<Arc<Room>> {
    let mut map = s.rooms.map.lock().await;
    if let Some(room) = map.get(&id) {
        room.conns.fetch_add(1, Ordering::SeqCst);
        return Ok(room.clone());
    }
    let saved: Option<Vec<u8>> = sqlx::query_scalar("SELECT yjs_state FROM documents WHERE id = $1").bind(id).fetch_one(&s.db).await?;
    let doc = Doc::new();
    if let Some(bytes) = saved {
        let update = Update::decode_v1(&bytes).map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, format!("corrupt document state: {e}")))?;
        doc.transact_mut().apply_update(update).map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, format!("corrupt document state: {e}")))?;
    }
    let room = Arc::new(Room { doc, tx: broadcast::channel(256).0, dirty: AtomicBool::new(false), conns: 1.into() });
    map.insert(id, room.clone());

    // Debounced persistence while the room is alive.
    let (s2, weak): (AppState, Weak<Room>) = (s.clone(), Arc::downgrade(&room));
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(2)).await;
            let Some(room) = weak.upgrade() else { break };
            if room.dirty.swap(false, Ordering::SeqCst) {
                if let Err(e) = persist(&s2, id, &room).await {
                    room.dirty.store(true, Ordering::SeqCst);
                    eprintln!("persist {id} failed: {}", e.1);
                }
            }
        }
    });
    Ok(room)
}

async fn leave(s: &AppState, id: Uuid, room: Arc<Room>) {
    let mut map = s.rooms.map.lock().await;
    if room.conns.fetch_sub(1, Ordering::SeqCst) == 1 {
        if room.dirty.swap(false, Ordering::SeqCst) {
            if let Err(e) = persist(s, id, &room).await {
                eprintln!("final persist {id} failed: {}", e.1); // room stays dropped; last <2s of edits may be lost
            }
        }
        map.remove(&id);
    }
}

/// Reject cross-origin browser connections (cookies ride along on WebSocket handshakes).
fn same_origin(headers: &HeaderMap) -> bool {
    let Some(origin) = headers.get(header::ORIGIN).and_then(|v| v.to_str().ok()) else { return true };
    let host = headers.get(header::HOST).and_then(|v| v.to_str().ok()).unwrap_or("");
    origin.split("://").nth(1) == Some(host)
}

pub async fn connect(State(s): State<AppState>, user: User, Path(id): Path<Uuid>, headers: HeaderMap, ws: WebSocketUpgrade) -> Res<Response> {
    if !same_origin(&headers) {
        return Err(AppError::new(StatusCode::FORBIDDEN, "cross-origin sync is not allowed"));
    }
    let Some(role) = docs::access(&s, user.id, id).await? else {
        return Err(AppError::new(StatusCode::NOT_FOUND, "no such document"));
    };
    let read_only = role == "view";
    let room = join(&s, id).await?;
    Ok(ws.on_upgrade(move |socket| async move {
        serve(&s, &room, socket, read_only).await;
        leave(&s, id, room).await;
    }))
}

/// The current state of a document as one Yjs update: the live room's if open, else the saved one.
pub async fn snapshot(s: &AppState, id: Uuid) -> Res<Vec<u8>> {
    if let Some(room) = s.rooms.map.lock().await.get(&id) {
        return Ok(room.doc.transact().encode_state_as_update_v1(&StateVector::default()));
    }
    let saved: Option<Vec<u8>> = sqlx::query_scalar("SELECT yjs_state FROM documents WHERE id = $1").bind(id).fetch_one(&s.db).await?;
    Ok(saved.unwrap_or_else(|| Doc::new().transact().encode_state_as_update_v1(&StateVector::default())))
}

/// `read_only`: a viewer. They receive every change and share presence, but their updates are dropped.
async fn serve(s: &AppState, room: &Room, socket: WebSocket, read_only: bool) {
    let me = s.rooms.next_conn.fetch_add(1, Ordering::SeqCst);
    let (mut sink, mut stream) = socket.split();
    let mut rx = room.tx.subscribe();
    let hello = Message::Sync(SyncMessage::SyncStep1(room.doc.transact().state_vector())).encode_v1();
    if sink.send(Ws::Binary(hello.into())).await.is_err() {
        return;
    }
    loop {
        tokio::select! {
            incoming = stream.next() => {
                let data = match incoming {
                    Some(Ok(Ws::Binary(d))) => d,
                    Some(Ok(Ws::Close(_))) | None | Some(Err(_)) => break,
                    Some(Ok(_)) => continue,
                };
                if data.first() == Some(&MSG_AWARENESS) {
                    let _ = room.tx.send((me, Arc::new(data.to_vec()))); // presence: relay as-is
                    continue;
                }
                let reply = match Message::decode_v1(&data) {
                    Ok(Message::Sync(SyncMessage::SyncStep1(sv))) => {
                        Some(Message::Sync(SyncMessage::SyncStep2(room.doc.transact().encode_state_as_update_v1(&sv))).encode_v1())
                    }
                    Ok(Message::Sync(SyncMessage::SyncStep2(_) | SyncMessage::Update(_))) if read_only => None,
                    Ok(Message::Sync(SyncMessage::SyncStep2(u) | SyncMessage::Update(u))) => {
                        let applied = Update::decode_v1(&u).map_err(|e| e.to_string())
                            .and_then(|up| room.doc.transact_mut().apply_update(up).map_err(|e| e.to_string()));
                        if let Err(e) = applied {
                            eprintln!("rejected update: {e}");
                            break;
                        }
                        room.dirty.store(true, Ordering::SeqCst);
                        let _ = room.tx.send((me, Arc::new(Message::Sync(SyncMessage::Update(u)).encode_v1())));
                        None
                    }
                    Ok(_) => None,
                    Err(_) => break,
                };
                if let Some(r) = reply {
                    if sink.send(Ws::Binary(r.into())).await.is_err() { break }
                }
            }
            out = rx.recv() => match out {
                Ok((from, bytes)) if from != me => {
                    if sink.send(Ws::Binary(bytes.to_vec().into())).await.is_err() { break }
                }
                Ok(_) => {}
                // Fell behind: drop the socket; the client reconnects and resyncs from state vectors.
                Err(_) => break,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::same_origin;
    use axum::http::{header, HeaderMap};

    #[test]
    fn origin_check() {
        let mut h = HeaderMap::new();
        h.insert(header::HOST, "localhost:3000".parse().unwrap());
        assert!(same_origin(&h), "non-browser clients send no Origin");
        h.insert(header::ORIGIN, "http://localhost:3000".parse().unwrap());
        assert!(same_origin(&h));
        h.insert(header::ORIGIN, "https://evil.example".parse().unwrap());
        assert!(!same_origin(&h));
    }
}
