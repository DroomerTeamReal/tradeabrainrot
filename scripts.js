const API_ROOT = (location.hostname === 'localhost') ? 'http://localhost:8000' : 'https://YOUR_BACKEND_URL';


// UI wiring
const viewButtons = document.querySelectorAll('.sidebar nav button');
const views = document.querySelectorAll('.view');
viewButtons.forEach(b => b.addEventListener('click', ()=>{
viewButtons.forEach(x=>x.classList.remove('active'));
b.classList.add('active');
const view = b.dataset.view;
views.forEach(v=>v.classList.toggle('hidden', !v.id.endsWith(view)));
}));


// Registration
const registerForm = document.getElementById('register-form');
registerForm.addEventListener('submit', async e=>{
e.preventDefault();
const email = document.getElementById('email').value.trim().toLowerCase();
const displayName = document.getElementById('displayName').value.trim();
const password = document.getElementById('password').value;
if(!email || !password) return alert('Fill fields');


const res = await fetch(API_ROOT + '/api/register', {
method:'POST', headers:{'Content-Type':'application/json'},
body: JSON.stringify({ email, displayName, password })
});
const j = await res.json();
if(res.ok) {
alert('Account created');
loadTraders();
loadMyAccounts();
registerForm.reset();
} else {
alert(j.error || 'Failed');
}
});


async function loadTraders(){
const res = await fetch(API_ROOT + '/api/traders');
const data = await res.json();
const container = document.getElementById('traders-list');
container.innerHTML = '';
data.forEach(t => {
const el = document.createElement('div'); el.className='trader';
el.innerHTML = `<h4>${escapeHtml(t.displayName||t.email)}</h4>
<div class="meta">${escapeHtml(t.email)}</div>
<div class="actions">
<button class="message">Message</button>
<button class="block">Block</button>
</div>`;
el.querySelector('.block').addEventListener('click', ()=> blockUser('demo@me', t.email));
el.querySelector('.message').addEventListener('click', ()=> openMessageModal('demo@me', t.email, t.displayName));
container.appendChild(el);
});
}


async function loadMyAccounts(){
const res = await fetch(API_ROOT + '/api/accounts');
const data = await res.json();
const container = document.getElementById('accounts-list');
container.innerHTML = data.map(a=>`<div class="trader"><h4>${escapeHtml(a.displayName||a.email)}</h4><div class="meta">${escapeHtml(a.email)}</div></div>`).join('');
}


// Blocking (demo requires `fromEmail` to exist) — in practice you'd use auth
async function blockUser(fromEmail,targetEmail){
if(!confirm('Block '+targetEmail+'?')) return;
await fetch(API_ROOT + '/api/block',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fromEmail,targetEmail})});
alert('Blocked');
}


// Messaging modal
const modal = document.getElementById('msg-modal');
const msgTarget = document.getElementById('msg-target');
const msgBody = document.getElementById('msg-body');
let msgContext = null;
function openMessageModal(fromEmail,targetEmail,displayName){
msgContext = {fromEmail,targetEmail};
msgTarget.textContent = displayName || targetEmail;
msgBody.value = '';
modal.classList.remove('hidden');
}
document.getElementById('msg-cancel').addEventListener('click', ()=> modal.classList.add('hidden'));
document.getElementById('msg-send').addEventListener('click', async ()=>{
const body = msgBody.value.trim(); if(!body) return alert('Write message');
await fetch(API_ROOT + '/api/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...msgContext, message: body})});
alert('Sent (demo)');
modal.classList.add('hidden');
});


function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }


// On load
loadTraders(); loadMyAccounts();
