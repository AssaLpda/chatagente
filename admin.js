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

const usersList = document.getElementById("usersList");
const chatHeader = document.getElementById("chatHeader");
const messagesDiv = document.getElementById("messages");
const replyForm = document.getElementById("replyForm");
const replyInput = document.getElementById("replyInput");

// Cloudinary
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dwrfndfzs/upload';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default';

let currentUserId = null;
let mensajesRef = null;

// Sonido de notificación
const notificacionAudio = new Audio("https://notificationsounds.com/notification-sounds/event-538/download/mp3");

function cargarUsuarios() {
  db.ref("chats").on("value", (snapshot) => {
    const usuarios = [];

    snapshot.forEach((userSnap) => {
      const userId = userSnap.key;
      const mensajes = userSnap.child("mensajes");

      let nombre = userId;
      let primerTimestamp = 0;
      let sinLeer = 0;
      let ultimoTimestamp = 0;

      if (mensajes.exists()) {
        mensajes.forEach((msgSnap) => {
          const msg = msgSnap.val();

          // Aquí se cambió para que cuente también tipo "archivo"
          if (msg.tipo === "user" || msg.tipo === "archivo") {
            if (!primerTimestamp || msg.timestamp < primerTimestamp) {
              primerTimestamp = msg.timestamp;
              if (msg.nombre) nombre = msg.nombre;
            }

            if (!msg.leido) sinLeer++;
            if (msg.timestamp > ultimoTimestamp) {
              ultimoTimestamp = msg.timestamp;
            }
          }
        });
      }

      console.log(`Usuario ${userId} (${nombre}): mensajes sin leer = ${sinLeer}`); // DEBUG

      usuarios.push({ userId, nombre, sinLeer, ultimoTimestamp });
    });

    usuarios.sort((a, b) => {
      if (b.sinLeer !== a.sinLeer) return b.sinLeer - a.sinLeer;
      return b.ultimoTimestamp - a.ultimoTimestamp;
    });

    usersList.innerHTML = "";
    if (usuarios.length === 0) {
      usersList.innerHTML = "<i>No hay usuarios conectados aún.</i>";
      chatHeader.textContent = "Seleccioná un usuario";
      messagesDiv.innerHTML = "";
      replyForm.style.display = "none";
      return;
    }

    usuarios.forEach((usuario) => {
      const div = document.createElement("div");
      const label =
        usuario.sinLeer > 0
          ? ` (${usuario.sinLeer} mensaje${usuario.sinLeer > 1 ? "s" : ""} sin leer)`
          : "";
      div.textContent = `${usuario.nombre}${label}`;
      div.className = "user-item";
      div.onclick = () => seleccionarUsuario(usuario.userId, usuario.nombre);
      usersList.appendChild(div);
    });
  });
}

function seleccionarUsuario(userId, nombre) {
  currentUserId = userId;
  chatHeader.textContent = `Chat con: ${nombre}`;
  messagesDiv.innerHTML = "";
  replyForm.style.display = "flex";
  replyInput.value = "";
  replyInput.focus();

  // Aquí también se cambia para marcar como leídos ambos tipos
  db.ref(`chats/${userId}/mensajes`).once("value", (snapshot) => {
    snapshot.forEach((msgSnap) => {
      const msg = msgSnap.val();
      if ((msg.tipo === "user" || msg.tipo === "archivo") && !msg.leido) {
        msgSnap.ref.update({ leido: true });
        console.log(`Mensaje marcado como leído:`, msg);
      }
    });
  });

  if (mensajesRef) mensajesRef.off();

  mensajesRef = db.ref(`chats/${userId}/mensajes`);
  mensajesRef.on("child_added", (snapshot) => {
    const msg = snapshot.val();
    console.log("Nuevo mensaje recibido en admin:", msg); // DEBUG

    const div = document.createElement("div");
    div.className = "message " + (msg.tipo === "user" ? "user-msg" : "admin-msg");

    const contenido = document.createElement("div");

    if (msg.tipo === "archivo") {
      if (msg.mensaje.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i)) {
        const link = document.createElement("a");
        link.href = msg.mensaje;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        const img = document.createElement("img");
        img.src = msg.mensaje;
        img.alt = "Imagen enviada";
        img.style.maxWidth = "200px";
        img.style.borderRadius = "8px";

        link.appendChild(img);
        contenido.appendChild(link);
      } else {
        const link = document.createElement("a");
        link.href = msg.mensaje;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "📎 Ver archivo adjunto";
        link.style.color = "#0066cc";
        link.style.textDecoration = "underline";
        contenido.appendChild(link);
      }
    } else {
      const partes = msg.mensaje.split("\n");
      partes.forEach((parte, i) => {
        contenido.appendChild(document.createTextNode(parte));
        if (i < partes.length - 1) contenido.appendChild(document.createElement("br"));
      });
    }

    div.appendChild(contenido);

    const tsDiv = document.createElement("div");
    tsDiv.className = "timestamp";
    tsDiv.textContent = new Date(msg.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    div.appendChild(tsDiv);
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // 🔔 Notificación (solo si no lo enviaste vos)
    if (msg.tipo === "user" || msg.tipo === "archivo") {
      console.log("Reproduciendo notificación para mensaje tipo:", msg.tipo);
      notificacionAudio.play().catch(() => {});
    }
  });
}

replyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const texto = replyInput.value.trim();
  if (!texto || !currentUserId) return;

  db.ref(`chats/${currentUserId}/mensajes`).push({
    nombre: "Admin",
    mensaje: texto,
    tipo: "admin",
    timestamp: Date.now(),
  });

  replyInput.value = "";
});

cargarUsuarios();






