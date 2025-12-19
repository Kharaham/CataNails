export async function fetchSAMMasks({ serverURL, blob }) {
  if (!serverURL || serverURL === "undefined" || serverURL === "null") {
    throw new Error(
      `SAM server URL inválida: "${serverURL}". Define REACT_APP_SAM_URL.`
    );
  }
  const base = serverURL.replace(/\/+$/, "");
  const form = new FormData();
  form.append("image", blob, "hand.jpg");

  const res = await fetch(`${base}/predict`, { method: "POST", body: form });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`SAM server error: ${res.status} ${txt}`);
  }

  const data = await res.json();
  return { masks: data.masks || [] };
}
