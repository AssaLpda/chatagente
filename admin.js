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
  db.ref('chats').on('value', snapshot => {
    usersList.innerHTML = '';
    if (!snapshot.exists()) {
      usersList.innerHTML = '<i>No hay usuarios conectados aún.</i>';
      chatHeader.textContent = 'Seleccioná un usuario';
      messagesDiv.innerHTML = '';
      replyForm.style.display = 'none';
      return;
    }
    snapshot.forEach(userSnap => {
      const userId = userSnap.key;
      let nombre = userId;
      const mensajes = userSnap.child('mensajes');
      if (mensajes.exists()) {
        let lastMsg = null;
        mensajes.forEach(msgSnap => {
          if (!lastMsg || msgSnap.val().timestamp > lastMsg.timestamp) {
            lastMsg = msgSnap.val();
          }
        });
        if (lastMsg && lastMsg.nombre && lastMsg.tipo === 'user') nombre = lastMsg.nombre;
      }
      const div = document.createElement('div');
      div.textContent = nombre;
      div.className = 'user-item';
      div.onclick = () => seleccionarUsuario(userId, nombre);
      usersList.appendChild(div);
    });
  });
}

function seleccionarUsuario(userId, nombre) {
  currentUserId = userId;
  chatHeader.textContent = `Chat con: ${nombre}`;
  messagesDiv.innerHTML = '';
  replyForm.style.display = 'flex';
  replyInput.value = '';
  replyInput.focus();

  if (mensajesRef) mensajesRef.off();

  mensajesRef = db.ref(`chats/${userId}/mensajes`);
  mensajesRef.on('child_added', snapshot => {
    const msg = snapshot.val();
    const div = document.createElement('div');
    div.className = 'message ' + (msg.tipo === 'user' ? 'user-msg' : 'admin-msg');
    div.innerHTML = `
      <div>${msg.mensaje}</div>
      <div class="timestamp">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
    `;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

replyForm.addEventListener('submit', e => {
  e.preventDefault();
  const texto = replyInput.value.trim();
  if (!texto || !currentUserId) return;
  db.ref(`chats/${currentUserId}/mensajes`).push({
    nombre: 'Admin',
    mensaje: texto,
    tipo: 'admin',
    timestamp: Date.now()
  });
  replyInput.value = '';
});

cargarUsuarios();


