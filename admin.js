
document.addEventListener('DOMContentLoaded', () => {
    // 0. Check Fundamentals
    const errorEl = document.getElementById('login-error');
    if (typeof firebase === 'undefined' || typeof auth === 'undefined') {
        console.error("Firebase/Auth not loaded.");
        if (errorEl) errorEl.innerHTML = `
            <div style="background: rgba(255,0,0,0.1); padding: 1rem; border-radius: 8px; border: 1px solid red; color: red;">
                <strong>System Error:</strong> Firebase SDK could not be loaded.<br>
                1. Check your internet connection.<br>
                2. Disable AdBlockers or Privacy extensions.<br>
                3. Check console for details.
            </div>`;
        return;
    }

    // -- Elements --
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const phoneForm = document.getElementById('phone-form');
    const otpForm = document.getElementById('otp-form');
    const logoutBtn = document.getElementById('logout-btn');

    // -- 1. Recaptcha Init --
    try {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                'size': 'invisible'
            });
        }
    } catch (e) {
        console.error("Recaptcha Init Error:", e);
    }

    // -- 2. Auth State Listener --
    auth.onAuthStateChanged(user => {
        if (user) {
            loginView.classList.add('hidden');
            dashboardView.classList.remove('hidden');
            initDashboard();
        } else {
            loginView.classList.remove('hidden');
            dashboardView.classList.add('hidden');
        }
    });

    // -- 3. Phone Login Flow --
    phoneForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let phoneNumber = document.getElementById('phoneNumber').value.trim();
        const errorEl = document.getElementById('login-error'); // ensure scope

        // Auto-prepend +91
        if (!phoneNumber.startsWith('+')) {
            phoneNumber = '+91' + phoneNumber;
        }

        errorEl.textContent = "Sending OTP to " + phoneNumber + "...";

        if (!window.recaptchaVerifier) {
            errorEl.textContent = "Recaptcha not ready. Refreshing...";
            location.reload();
            return;
        }

        auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
            .then((confirmationResult) => {
                window.confirmationResult = confirmationResult;
                errorEl.textContent = "";
                phoneForm.classList.add('hidden');
                otpForm.classList.remove('hidden');
            }).catch((error) => {
                errorEl.textContent = error.message;
                console.error(error);
                if (window.recaptchaVerifier) {
                    window.recaptchaVerifier.render().then(widgetId => grecaptcha.reset(widgetId));
                }
            });
    });

    // -- 4. Verify OTP --
    otpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = document.getElementById('otpCode').value;
        const errorEl = document.getElementById('login-error');

        if (!window.confirmationResult) return;

        window.confirmationResult.confirm(code).then((result) => {
            errorEl.textContent = "";
            otpForm.classList.add('hidden');
            phoneForm.classList.remove('hidden'); // Reset for next time or just let auth state take over
        }).catch((error) => {
            errorEl.textContent = "Invalid OTP. Please try again.";
            console.error(error);
        });
    });

    // -- 5. Logout --
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // -- 6. Dashboard Actions (Delegated) --
    // We attach these once. safely.
    document.body.addEventListener('click', async (e) => {
        // Save Config
        if (e.target && e.target.id == 'save-config-btn') {
            const btn = e.target;
            const status = document.getElementById('config-status');
            const data = jsonEditor.get();

            btn.disabled = true;
            status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                await db.collection('content').doc('main').set(data);
                status.innerHTML = '<span style="color: #00ff00;">Saved successfully!</span>';
                setTimeout(() => status.innerHTML = '', 3000);
            } catch (e) {
                status.innerHTML = `<span style="color: red;">Error: ${e.message}</span>`;
            }
            btn.disabled = false;
        }

        // Publish Button (or inside button)
        if (e.target && (e.target.id == 'publish-btn' || e.target.closest('#publish-btn'))) {
            publishArticle();
        }
    });

    // Project List Init
    const projectList = document.getElementById('project-list');
    if (projectList) {
        // defined below
    }
});


// -- Dashboard Logic Helper Functions --
let quill;
let jsonEditor;
let editingId = null; // Track if we are editing a post

function initDashboard() {
    loadProjects();
    initQuill();
    initJsonEditor();
}



function initQuill() {
    if (quill) return;
    const editorEl = document.getElementById('editor-container');
    if (!editorEl) return;



    quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: 'Write something amazing...',
        modules: {
            syntax: true, // Enable syntax highlighting
            toolbar: {
                container: [
                    [{ 'font': [] }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
                    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                    ['blockquote', 'code-block'],

                    [{ 'header': 1 }, { 'header': 2 }],               // custom button values
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
                    [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
                    [{ 'direction': 'rtl' }],                         // text direction

                    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
                    [{ 'align': [] }],

                    ['clean'],                                         // remove formatting button
                    ['link', 'image', 'video']
                ],
                handlers: {
                    'image': selectLocalImage
                }
            }
        }
    });
    
    // Tooltip for custom button
    setTimeout(() => {
        const dividerBtn = document.querySelector('.ql-divider');
        if (dividerBtn) dividerBtn.title = "Restart List Numbering (Split List)";
    }, 100);

    // Tooltip for custom button
    setTimeout(() => {
        const dividerBtn = document.querySelector('.ql-divider');
        if (dividerBtn) dividerBtn.title = "Restart List Numbering (Split List)";
    }, 100);
}







function selectLocalImage() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
        const file = input.files[0];
        if (/^image\//.test(file.type)) {
            saveToServer(file);
        } else {
            console.warn('You could only upload images.');
        }
    };
}

function saveToServer(file) {
    const uploadStatus = document.getElementById('upload-status');
    const range = quill.getSelection();

    uploadStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading Image...';

    const storageRef = storage.ref();
    const fileRef = storageRef.child(`blog-images/${Date.now()}_${file.name}`);

    fileRef.put(file).then(async (snapshot) => {
        const url = await snapshot.ref.getDownloadURL();
        quill.insertEmbed(range.index, 'image', url);
        uploadStatus.innerHTML = '';
    }).catch((error) => {
        console.error('Image upload failed:', error);
        uploadStatus.innerHTML = `<span style="color: red;">Image upload failed: ${error.message}</span>`;
    });
}

function initJsonEditor() {
    if (jsonEditor) return;
    const container = document.getElementById("jsoneditor");
    if (!container) return;

    const options = {
        mode: 'tree',
        modes: ['code', 'tree'],
    };
    jsonEditor = new JSONEditor(container, options);

    // Fetch initial data
    db.collection('content').doc('main').get().then((doc) => {
        if (doc.exists) {
            let data = doc.data();
            // Ensure references exists for legacy data
            if (!data.references) {
                data.references = [
                    { name: "Reference Name", role: "Manager", company: "Company", contact: "email@example.com" }
                ];
            }
            jsonEditor.set(data);
        } else {
            // Default Template if no data exists
            jsonEditor.set({
                hero: {
                    name: "Your Name",
                    title: "Web Developer",
                    tags: ["Design", "Code"],
                    image: ""
                },
                about: {
                    summary: "Write your professional bio here..."
                },
                experience: [
                    { title: "Job Title", company: "Company Name", date: "2023 - Present", description: "Describe your role." }
                ],
                skills: {
                    "Frontend": ["HTML", "CSS", "JavaScript"],
                    "Backend": ["Node.js", "Firebase"]
                },
                education: [
                    { degree: "Degree Name", school: "University Name", year: "2023" }
                ],
                social: {
                    email: "mailto:example@example.com",
                    github: "https://github.com",
                    linkedin: "https://linkedin.com"
                },
                references: [
                    { name: "Reference Name", role: "Manager", company: "Company", contact: "email@example.com" }
                ]
            });
        }
    });
}


async function publishArticle() {
    const title = document.getElementById('post-title').value;
    const content = quill.root.innerHTML;
    const uploadStatus = document.getElementById('upload-status');
    const publishBtn = document.getElementById('publish-btn'); // Get the button element

    if (!title.trim()) {
        alert("Please enter a title");
        return;
    }

    if (content === '<p><br></p>') {
        alert("Please write some content");
        return;
    }

    uploadStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (editingId ? 'Updating...' : 'Publishing...');

    try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = content;
        let preview = tempDiv.textContent || tempDiv.innerText || "";
        preview = preview.substring(0, 300) + (preview.length > 300 ? "..." : "");

        const data = {
            title: title,
            htmlContent: content,
            previewText: preview,
            type: 'article',
            // Only update date if new? Or keep original date? Let's update "updatedAt" maybe.
            // For simplicity, we just keep formatting logic same.
        };

        if (editingId) {
            await db.collection('projects').doc(editingId).update(data);
            uploadStatus.innerHTML = '<span style="color: #00ff00;">Article Updated!</span>';
        } else {
            data.date = new Date().toISOString().split('T')[0];
            data.timestamp = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('projects').add(data);
            uploadStatus.innerHTML = '<span style="color: #00ff00;">Article Published!</span>';
        }

        // Reset Form
        document.getElementById('post-title').value = '';
        quill.setContents([]);
        editingId = null;
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish Article'; // Reset button text

        setTimeout(() => uploadStatus.innerHTML = '', 3000);

        // Refresh list logic will auto-trigger via onSnapshot? Yes.

    } catch (e) {
        console.error(e);
        uploadStatus.innerHTML = `<span style="color: red;">Error: ${e.message}</span>`;
    }
}

// Global project loader
function loadProjects() {
    const projectList = document.getElementById('project-list');
    if (!projectList) return;

    db.collection('projects').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        projectList.innerHTML = '';
        window.projectsMap = {}; // Reset map

        if (snapshot.empty) {
            projectList.innerHTML = '<div style="color: var(--text-muted); text-align: center;">No posts yet. Write one!</div>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            window.projectsMap[doc.id] = data; // Store for access
            
            const div = document.createElement('div');
            div.className = 'project-item';

            div.innerHTML = `
                <div style="flex: 1; overflow: hidden; margin-right: 1rem;">
                    <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.title}</div>
                    <small style="color: var(--text-muted);">${data.date}</small>
                </div>
                <div style="display:flex; gap: 0.5rem;">
                    <button class="btn btn-outline" style="padding: 0.5rem; color: var(--accent-gold); border-color: var(--accent-gold);" onclick="editProject('${doc.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline" style="padding: 0.5rem; border-color: #ef4444; color: #ef4444;" onclick="deleteProject('${doc.id}', '${data.filename || ''}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            projectList.appendChild(div);
        });
    });
}

// Edit project handler
window.editProject = (id) => {
    const data = window.projectsMap[id];
    if (!data) return;

    editingId = id;
    document.getElementById('post-title').value = data.title;

    // Check if rich text or legacy
    // Check if rich text or legacy
    if (data.htmlContent) {
        // Quill 2.0: Use dangerouslyPasteHTML to run matchers and convert legacy HTML
        quill.clipboard.dangerouslyPasteHTML(data.htmlContent);
    } else {
        // Legacy docx
        quill.setText(data.previewText || "Legacy content not editable.");
    }

    // Change button text
    const publishBtn = document.getElementById('publish-btn'); // We need to grab this again or ensure scope
    if (publishBtn) publishBtn.innerHTML = '<i class="fas fa-save"></i> Update Article';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
};


// Delete needs to be global for onclick in innerHTML
window.deleteProject = async (docId, filename) => {
    if (!confirm('Delete this post?')) return;
    try {
        if (filename) await storage.ref(`projects/${filename}`).delete().catch(e => console.warn("File not found or already deleted"));
        await db.collection('projects').doc(docId).delete();
    } catch (err) {
        alert("Error: " + err.message);
    }
};

window.switchTab = (tabId) => {
    document.getElementById('projects-tab').classList.add('hidden');
    document.getElementById('profile-tab').classList.add('hidden');
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.remove('hidden');

    const tabs = { 'projects-tab': 0, 'profile-tab': 1 };
    const tabEls = document.querySelectorAll('.nav-tab');
    if (tabEls[tabs[tabId]]) tabEls[tabs[tabId]].classList.add('active');
};
