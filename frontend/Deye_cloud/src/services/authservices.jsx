import API_BASE from '../pages/config'

export async function login(email, password) {

  const res = await fetch(`${API_BASE}/login`, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      email,
      password
    })

  });

  const data = await res.json();

  if (data.token) {

    localStorage.setItem("token", data.token);

    return { success: true };

  }

  return { success: false };

}

export function logout() {

  localStorage.removeItem("token");

}

export function isAuthenticated() {

  return localStorage.getItem("token") !== null;

}
