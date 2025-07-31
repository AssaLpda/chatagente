const firebaseConfig = {
  apiKey: "AIzaSyCpAcMa6rYSulwQSYsUsqpm3SPjnXV6Poo",
  authDomain: "chatlanding-dfee6.firebaseapp.com",
  databaseURL: "https://chatlanding-dfee6-default-rtdb.firebaseio.com",
  projectId: "chatlanding-dfee6",
  storageBucket: "chatlanding-dfee6.appspot.com",
  messagingSenderId: "627733533904",
  appId: "1:627733533904:web:15603a1266d40a647dbad5",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Cloudinary
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dwrfndfzs/upload';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default'; // asegurate de tener este preset activo

// DOM
const btnHablar = document.getElementById("btnHablar");
const chatWrapper = document.getElementById("chatWrapper");
const chatContainer = document.getElementById("chatContainer");
const mensajeInput = document.getElementById("mensajeInput");
const btnEnviar = document.getElementById("btnEnviar");

const fileInput = document.getElementById("fileInput");
const btnArchivo = document.getElementById("btnArchivo");

const nombreWrapper = document.getElementById("nombreWrapper");
const nombreInput = document.getElementById("nombreInput");
const btnNombre = document.getElementById("btnNombre");

const infoInicial = document.querySelector(".info-inicial");
const mensajePromocional = document.getElementById("mensajePromocional");

const notiContainerInicial = document.getElementById("notificaciones-container");
const notiContainerChat = document.getElementById("notificaciones-chat-container");
let currentNotiContainer = notiContainerInicial;

let userId = localStorage.getItem("chatUserId");
if (!userId) {
  userId = Date.now().toString();
  localStorage.setItem("chatUserId", userId);
}
let nombreUsuario = localStorage.getItem("chatNombre");

// Escribiendo
const escribiendoRef = db.ref(`chats/${userId}/escribiendo`);
let escribiendoTimeout;
function setEscribiendo(val) {
  escribiendoRef.set(val);
  if (val) {
    clearTimeout(escribiendoTimeout);
    escribiendoTimeout = setTimeout(() => escribiendoRef.set(false), 2000);
  }
}

btnHablar.addEventListener("click", () => {
  if (!nombreUsuario) {
    nombreWrapper.style.display = "flex";
  } else {
    iniciarChatYMostrarUI();
  }

  currentNotiContainer = notiContainerChat;
  notiContainerInicial.style.display = "none";
  notiContainerChat.style.display = "flex";
});

btnNombre.addEventListener("click", () => {
  const nombre = nombreInput.value.trim();
  if (!nombre) return alert("Por favor, ingresá tu nombre.");

  nombreUsuario = nombre;
  localStorage.setItem("chatNombre", nombreUsuario);

  const now = Date.now();
  const mensajeBienvenida = {
    nombre: "Admin",
    mensaje: "¡Hola! Bienvenido/a!❤️. Decime tu nombre así te brindo un usuario para jugar",
    tipo: "admin",
    timestamp: now,
  };

  const primerMensajeUsuario = {
    nombre: nombreUsuario,
    mensaje: `Hola, mi nombre es: ${nombreUsuario}`,
    tipo: "user",
    timestamp: now,
  };

  const ref = db.ref(`chats/${userId}/mensajes`);
  ref.once("value").then((snapshot) => {
    if (!snapshot.exists()) {
      ref.push(mensajeBienvenida);
      ref.push(primerMensajeUsuario);
    }
    iniciarChatYMostrarUI();
  });
});

function iniciarChatYMostrarUI() {
  infoInicial.style.display = "none";
  nombreWrapper.style.display = "none";
  mensajePromocional.style.display = "block";
  chatWrapper.style.display = "flex";

  currentNotiContainer = notiContainerChat;
  notiContainerInicial.style.display = "none";
  notiContainerChat.style.display = "flex";

  notiContainerChat.innerHTML = "";
  clearInterval(window.notiInterval);
  iniciarChat();
}

function iniciarChat() {
  escucharMensajes();
  mensajeInput.focus();
}

function linkify(text) {
  const urlPattern = /(\b(https?:\/\/|www\.)[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
  return text.replace(urlPattern, (url) => {
    let href = url;
    if (!href.startsWith("http")) href = "http://" + href;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

function mostrarMensaje(snapshot) {
  const { mensaje, tipo, timestamp } = snapshot.val();
  const div = document.createElement("div");
  div.className = tipo === "user" ? "user message" : "admin message";

  if (tipo === "archivo") {
    // Mostrar imagen o enlace para archivos
    if (mensaje.match(/\.(jpeg|jpg|gif|png|svg)$/i)) {
      div.innerHTML = `<div class="burbuja"><img src="${mensaje}" alt="archivo" style="max-width: 100%; border-radius: 10px;" /></div>`;
    } else {
      div.innerHTML = `<div class="burbuja"><a href="${mensaje}" target="_blank" style="color: #075e54;">📎 Ver archivo adjunto</a></div>`;
    }
  } else {
    let mensajeConLinks = linkify(mensaje).replace(/\n/g, "<br>");
    if (tipo === "admin") {
      const fecha = new Date(timestamp);
      const horas = fecha.getHours().toString().padStart(2, "0");
      const minutos = fecha.getMinutes().toString().padStart(2, "0");
      const horaStr = `${horas}:${minutos}`;
      div.innerHTML = `
        <div class="burbuja">
          <p>${mensajeConLinks}</p>
          <div class="meta" style="font-size: 10px; color: gray; text-align: right; margin-top: 5px;">
            <span class="hora">${horaStr}</span>
            <svg class="double-check" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" style="width: 14px; height: 14px; vertical-align: middle; fill: #4fc3f7;">
              <path d="M1.5 6L5.5 10L14.5 1" stroke="#4fc3f7" stroke-width="2" fill="none" />
            </svg>
          </div>
        </div>`;
    } else {
      div.innerHTML = `<div class="burbuja"><p>${mensajeConLinks}</p></div>`;
    }
  }

  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escucharMensajes() {
  const mensajesRef = db.ref(`chats/${userId}/mensajes`);
  mensajesRef.off();
  mensajesRef.on("child_added", mostrarMensaje);
}

function enviarMensaje() {
  const texto = mensajeInput.value.trim();
  if (!texto) return;

  const mensajeData = {
    nombre: nombreUsuario || "Usuario",
    mensaje: texto,
    tipo: "user",
    timestamp: Date.now(),
  };

  db.ref(`chats/${userId}/mensajes`).push(mensajeData).then(() => {
    mensajeInput.value = "";
    mensajeInput.focus();
    setEscribiendo(false);
  });
}

btnEnviar.addEventListener("click", enviarMensaje);
mensajeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    enviarMensaje();
  }
});
mensajeInput.addEventListener("input", () => {
  if (!userId) return;
  setEscribiendo(true);
});

btnArchivo.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    const fileUrl = data.secure_url;
    if (!fileUrl) throw new Error("No se recibió URL de Cloudinary");

    // Guardar solo la URL limpia y tipo archivo
    await db.ref(`chats/${userId}/mensajes`).push({
      nombre: nombreUsuario || "Usuario",
      mensaje: fileUrl,
      tipo: "archivo",
      timestamp: Date.now(),
    });

    e.target.value = '';
  } catch (err) {
    console.error("Error al subir a Cloudinary:", err);
    alert("Hubo un problema al subir el archivo.");
  }
});























