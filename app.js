/* app.js
   Simple, commented, human-friendly JS for the student registration system.
   Features: add, edit, delete, validation, localStorage persistence, dynamic scrollbar.
*/

// ----- Helpers -----
const $ = (sel) => document.querySelector(sel);
const qs = (sel) => Array.from(document.querySelectorAll(sel));

// Elements
const studentForm = $('#studentForm');
const nameInput = $('#name');
const sidInput = $('#sid');
const emailInput = $('#email');
const contactInput = $('#contact');

const studentsBody = $('#studentsBody');
const tableWrapper = $('#tableWrapper');

const errName = $('#err-name');
const errSid  = $('#err-sid');
const errEmail = $('#err-email');
const errContact = $('#err-contact');

const CLEAR_FORM = {
  id: null, // used when editing
  name: '',
  sid: '',
  email: '',
  contact: ''
};

// Key for localStorage
const STORAGE_KEY = 'student_registration_v1';

// In-memory list of students
let students = [];
let editingId = null; // id of student being edited

// ----- Validation functions (simple and readable) -----
function validateName(name) {
  if (!name.trim()) return 'Name is required';
  // allow spaces and letters only
  if (!/^[a-zA-Z\s]+$/.test(name.trim())) return 'Name must have letters and spaces only';
  return '';
}
function validateSID(sid) {
  if (!sid.trim()) return 'Student ID is required';
  if (!/^\d+$/.test(sid.trim())) return 'Student ID must be numeric';
  return '';
}
function validateEmail(email) {
  if (!email.trim()) return 'Email is required';
  // simple email regex
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return 'Enter a valid email';
  return '';
}
function validateContact(contact) {
  if (!contact.trim()) return 'Contact is required';
  if (!/^\d+$/.test(contact.trim())) return 'Contact must be numeric';
  if (contact.trim().length < 10) return 'Contact must be at least 10 digits';
  return '';
}

// Show validation errors in small elements
function showErrors(errors) {
  errName.textContent = errors.name || '';
  errSid.textContent = errors.sid || '';
  errEmail.textContent = errors.email || '';
  errContact.textContent = errors.contact || '';
}

// Clear the form inputs and errors
function clearForm() {
  studentForm.reset();
  showErrors({});
  editingId = null;
  $('#saveBtn').textContent = 'Save';
}

// ----- Persistence -----
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error('Error reading storage', e);
    return [];
  }
}
function saveToStorage(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ----- Render UI -----
function renderStudents() {
  studentsBody.innerHTML = '';
  if (students.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="opacity:0.75;padding:1rem;text-align:center">No students registered yet.</td>`;
    studentsBody.appendChild(tr);
  } else {
    students.forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.sid)}</td>
        <td>${escapeHtml(s.email)}</td>
        <td>${escapeHtml(s.contact)}</td>
        <td>
          <button data-id="${s.id}" class="action-btn edit-btn">Edit</button>
          <button data-id="${s.id}" class="action-btn del-btn">Delete</button>
        </td>
      `;
      studentsBody.appendChild(tr);
    });
  }

  // Attach event listeners for edit/delete (delegation would also work)
  qs('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      startEdit(id);
    });
  });
  qs('.del-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      deleteStudent(id);
    });
  });

  // Dynamic scrollbar: if rows exceed 5, enable vertical scroll
  const rowsCount = students.length;
  if (rowsCount > 5) {
    tableWrapper.style.overflowY = 'auto';
    tableWrapper.style.maxHeight = '300px';
  } else {
    tableWrapper.style.overflow = 'hidden';
    tableWrapper.style.maxHeight = 'none';
  }
}

// small helper to avoid HTML injection when displaying
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

// ----- CRUD functions -----
function addStudent(data) {
  // simple unique id using timestamp + random
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  students.push({ id, ...data });
  saveToStorage(students);
  renderStudents();
}

function startEdit(id) {
  const student = students.find(s => s.id === id);
  if (!student) return;
  editingId = id;
  nameInput.value = student.name;
  sidInput.value = student.sid;
  emailInput.value = student.email;
  contactInput.value = student.contact;
  $('#saveBtn').textContent = 'Update';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStudent(id, newData) {
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) return;
  students[idx] = { id, ...newData };
  saveToStorage(students);
  renderStudents();
}

function deleteStudent(id) {
  if (!confirm('Are you sure you want to delete this student?')) return;
  students = students.filter(s => s.id !== id);
  saveToStorage(students);
  renderStudents();
}

// ----- Form submit handler -----
studentForm.addEventListener('submit', function (ev) {
  ev.preventDefault();

  // collect values
  const name = nameInput.value.trim();
  const sid = sidInput.value.trim();
  const email = emailInput.value.trim();
  const contact = contactInput.value.trim();

  // validate
  const errors = {
    name: validateName(name),
    sid: validateSID(sid),
    email: validateEmail(email),
    contact: validateContact(contact)
  };

  // if any error string set, show and stop
  if (errors.name || errors.sid || errors.email || errors.contact) {
    showErrors(errors);
    return;
  }
  // prevent adding duplicate student ID (optional but useful)
  const duplicate = students.some(s => s.sid === sid && s.id !== editingId);
  if (duplicate) {
    showErrors({ sid: 'This Student ID already exists' });
    return;
  }

  // if editing
  if (editingId) {
    updateStudent(editingId, { name, sid, email, contact });
    clearForm();
    return;
  }

  // Add record
  addStudent({ name, sid, email, contact });
  clearForm();
});


//valid contact function
function validateContact(contact) {
  if (!contact.trim()) return 'Contact number is required';  
  if (contact.trim().length !== 10) return 'Contact number must be exactly 10 digits';
  return '';
}

// Clear button
$('#clearBtn').addEventListener('click', clearForm);

// ----- Input sanitization helpers: allow only digits in numeric fields -----
sidInput.addEventListener('input', () => {
  sidInput.value = sidInput.value.replace(/[^\d]/g, '');
});
contactInput.addEventListener('input', () => {
  contactInput.value = contactInput.value.replace(/[^\d]/g, '');
});
nameInput.addEventListener('input', () => {
  // allow letters and spaces only while typing (helps user)
  nameInput.value = nameInput.value.replace(/[^a-zA-Z\s]/g, '');
});

// ----- Init: load saved students and render -----
(function init() {
  students = loadFromStorage();
  renderStudents();
})();
