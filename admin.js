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

let currentUserId = null;
let mensajesRef = null;

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

          if (msg.tipo === "user") {
            if (!primerTimestamp || msg.timestamp < primerTimestamp) {
              primerTimestamp = msg.timestamp;
              if (msg.nombre) nombre = msg.nombre;
            }

            // Contar mensajes sin leer
            if (!msg.leido) sinLeer++;
            if (msg.timestamp > ultimoTimestamp) {
              ultimoTimestamp = msg.timestamp;
            }
          }
        });
      }

      usuarios.push({
        userId,
        nombre,
        sinLeer,
        ultimoTimestamp,
      });
    });

    // Ordenar: primero los con más mensajes sin leer, luego por último mensaje
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
          ? ` (${usuario.sinLeer} mensaje${usuario.sinLeer > 1 ? "s" : ""})`
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

  // Marcar mensajes como leídos
  db.ref(`chats/${userId}/mensajes`)
    .once("value", (snapshot) => {
      snapshot.forEach((msgSnap) => {
        const msg = msgSnap.val();
        if (msg.tipo === "user" && !msg.leido) {
          msgSnap.ref.update({ leido: true });
        }
      });
    })
    .catch(console.error);

  if (mensajesRef) mensajesRef.off();

  mensajesRef = db.ref(`chats/${userId}/mensajes`);
  mensajesRef.on("child_added", (snapshot) => {
    const msg = snapshot.val();
    const div = document.createElement("div");
    div.className = "message " + (msg.tipo === "user" ? "user-msg" : "admin-msg");

    // Crear nodo texto con saltos de línea respetados
    const mensajeContainer = document.createElement("div");
    const partes = msg.mensaje.split("\n");
    partes.forEach((parte, i) => {
      mensajeContainer.appendChild(document.createTextNode(parte));
      if (i < partes.length - 1) {
        mensajeContainer.appendChild(document.createElement("br"));
      }
    });

    div.appendChild(mensajeContainer);

    const tsDiv = document.createElement("div");
    tsDiv.className = "timestamp";
    tsDiv.textContent = new Date(msg.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    div.appendChild(tsDiv);

    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
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




