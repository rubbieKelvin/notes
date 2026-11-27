use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use base64::{engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD}, Engine};
use sha2::{Digest, Sha256};

const NONCE_LEN: usize = 12;

/// Encrypts users' own AI keys at rest. The master key never touches the database.
pub struct Cipher(Aes256Gcm);

impl Cipher {
    pub fn from_base64(secret: &str) -> Option<Self> {
        let key = STANDARD.decode(secret.trim()).ok()?;
        Aes256Gcm::new_from_slice(&key).ok().map(Self)
    }

    pub fn encrypt(&self, plaintext: &str) -> Vec<u8> {
        let mut nonce = [0u8; NONCE_LEN];
        rand::fill(&mut nonce);
        let ct = self.0.encrypt(&Nonce::from(nonce), plaintext.as_bytes()).expect("aes-gcm encrypt");
        [nonce.as_slice(), &ct].concat()
    }

    pub fn decrypt(&self, blob: &[u8]) -> Option<String> {
        let (nonce, ct) = blob.split_at_checked(NONCE_LEN)?;
        let nonce: [u8; NONCE_LEN] = nonce.try_into().ok()?;
        String::from_utf8(self.0.decrypt(&Nonce::from(nonce), ct).ok()?).ok()
    }
}

/// A random bearer secret (session cookie or API token), URL-safe.
pub fn new_token(prefix: &str) -> String {
    let mut buf = [0u8; 32];
    rand::fill(&mut buf);
    format!("{prefix}{}", URL_SAFE_NO_PAD.encode(buf))
}

/// Tokens are high-entropy, so a fast hash is enough; we only store this.
pub fn hash_token(token: &str) -> Vec<u8> {
    Sha256::digest(token.as_bytes()).to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_and_tamper() {
        let c = Cipher::from_base64(&STANDARD.encode([7u8; 32])).unwrap();
        let blob = c.encrypt("sk-ant-secret");
        assert_eq!(c.decrypt(&blob).as_deref(), Some("sk-ant-secret"));
        let mut bad = blob.clone();
        *bad.last_mut().unwrap() ^= 1;
        assert!(c.decrypt(&bad).is_none(), "tampered ciphertext must not decrypt");
        assert_ne!(c.encrypt("x"), c.encrypt("x"), "nonces must differ");
        assert!(Cipher::from_base64("too-short").is_none());
    }

    #[test]
    fn tokens_are_unique_and_hashed() {
        let (a, b) = (new_token("on_"), new_token("on_"));
        assert!(a.starts_with("on_") && a != b && a.len() > 40);
        assert_eq!(hash_token(&a), hash_token(&a));
    }
}
