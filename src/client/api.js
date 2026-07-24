
const API_BASE = "/api";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      ...options,
    });
  } catch {
    const err = new Error(
      "Network error — start the API with `npm run dev` in the project root (port 3000).",
    );
    err.status = 0;
    throw err;
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const err = new Error(
        res.ok
          ? "Invalid JSON from API"
          : `API error (${res.status}). Is the backend running?`,
      );
      err.status = res.status;
      throw err;
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error ?? res.statusText);
    err.status = res.status;
    err.field = data?.field;
    throw err;
  }

  return data;
}

export function listCategories() {
  return request("/categories");
}

export function getCategoryStatus(id, month) {
  const q = month ? `?month=${encodeURIComponent(month)}` : "";
  return request(`/categories/${id}/status${q}`);
}

export function listTransactions({ keyword, categoryId } = {}) {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (categoryId) params.set("categoryId", categoryId);
  const q = params.toString() ? `?${params}` : "";
  return request(`/transactions${q}`);
}

export function createTransaction(body) {
  return request("/transactions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTransaction(id, body) {
  return request(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteTransaction(id) {
  return request(`/transactions/${id}`, { method: "DELETE" });
}
