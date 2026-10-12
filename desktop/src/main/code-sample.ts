import type { CodeSampleLanguage } from '../types'

/**
 * The few lines Settings → Code & reviews previews a palette on, per language: a file
 * before and after a small change, so the preview shows the diff rails over the palette
 * as well as the palette itself — which is how code is actually read in this app.
 *
 * Kept short on purpose. Every row a sample adds is a row the settings page scrolls past,
 * and nine lines are enough to show a keyword, a string, a number, a type and a comment.
 */
export const CODE_SAMPLES: Record<CodeSampleLanguage, { before: string; after: string }> = {
  ts: {
    before: `const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  debug: true,
};
async function fetchUser(id: string): Promise<User> {
  const url = \`\${config.apiUrl}/users/\${id}\`;
  const res = await fetch(url);
  return res.json();
}
`,
    after: `const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
};
// Returns null when the user does not exist
async function fetchUser(id: string): Promise<User | null> {
  const url = \`\${config.apiUrl}/v2/users/\${id}\`;
  const res = await fetch(url);
  return res.ok ? res.json() : null;
}
`,
  },
  py: {
    before: `import httpx

TIMEOUT = 5.0

def fetch_user(user_id: str) -> dict:
    url = f"https://api.example.com/users/{user_id}"
    res = httpx.get(url, timeout=TIMEOUT)
    return res.json()
`,
    after: `import httpx

TIMEOUT = 5.0

# Returns None when the user does not exist
def fetch_user(user_id: str) -> dict | None:
    url = f"https://api.example.com/v2/users/{user_id}"
    res = httpx.get(url, timeout=TIMEOUT)
    return res.json() if res.is_success else None
`,
  },
  go: {
    before: `package api

const timeout = 5 * time.Second

func FetchUser(id string) (*User, error) {
	url := fmt.Sprintf("https://api.example.com/users/%s", id)
	res, err := http.Get(url)
	return decode(res, err)
}
`,
    after: `package api

const timeout = 5 * time.Second

// FetchUser returns nil when the user does not exist.
func FetchUser(ctx context.Context, id string) (*User, error) {
	url := fmt.Sprintf("https://api.example.com/v2/users/%s", id)
	res, err := client.Get(ctx, url)
	return decode(res, err)
}
`,
  },
  rs: {
    before: `const TIMEOUT: u64 = 5000;

pub async fn fetch_user(id: &str) -> User {
    let url = format!("https://api.example.com/users/{id}");
    let res = reqwest::get(&url).await.unwrap();
    res.json().await.unwrap()
}
`,
    after: `const TIMEOUT: u64 = 5000;

/// Returns None when the user does not exist.
pub async fn fetch_user(id: &str) -> Option<User> {
    let url = format!("https://api.example.com/v2/users/{id}");
    let res = reqwest::get(&url).await.ok()?;
    res.json().await.ok()
}
`,
  },
}
