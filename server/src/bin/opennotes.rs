//! `opennotes push [--title T] [--agent A] [--source URI] < file`
//! Sends stdin to your opennotes AI inbox. Needs OPENNOTES_TOKEN (an API token with the `ingest` scope)
//! and optionally OPENNOTES_URL (default http://localhost:3000).
use std::io::Read;

const USAGE: &str = "usage: opennotes push [--title T] [--agent A] [--source URI] < file";

fn fail(msg: &str) -> ! {
    eprintln!("opennotes: {msg}");
    std::process::exit(1)
}

#[tokio::main]
async fn main() {
    let mut args = std::env::args().skip(1);
    if args.next().as_deref() != Some("push") {
        fail(USAGE);
    }
    let mut body = serde_json::json!({ "agent_id": "cli" });
    while let Some(flag) = args.next() {
        let key = match flag.as_str() {
            "--title" => "title",
            "--agent" => "agent_id",
            "--source" => "source_uri",
            _ => fail(USAGE),
        };
        body[key] = args.next().unwrap_or_else(|| fail(USAGE)).into();
    }
    let mut content = String::new();
    std::io::stdin().read_to_string(&mut content).unwrap_or_else(|e| fail(&format!("reading stdin: {e}")));
    if content.trim().is_empty() {
        fail("nothing on stdin");
    }
    body["content_md"] = content.into();

    let token = std::env::var("OPENNOTES_TOKEN").unwrap_or_else(|_| fail("set OPENNOTES_TOKEN (Settings → API tokens, scope: ingest)"));
    let base = std::env::var("OPENNOTES_URL").unwrap_or_else(|_| "http://localhost:3000".into());
    let res = reqwest::Client::new()
        .post(format!("{}/v1/notes/ingest", base.trim_end_matches('/')))
        .bearer_auth(token.trim())
        .json(&body)
        .send()
        .await
        .unwrap_or_else(|e| fail(&format!("request failed: {e}")));
    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    if !status.is_success() {
        fail(&format!("{status}: {text}"));
    }
    println!("queued in your AI inbox");
}
