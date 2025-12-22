
document.addEventListener('DOMContentLoaded', () => {
    // 0. Check Fundamentals
    const errorEl = document.getElementById('login-error');
    if (typeof firebase === 'undefined' || typeof auth === 'undefined') {
        console.error("Firebase/Auth not loaded.");
        if(errorEl) errorEl.innerHTML = `
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
        if(!window.recaptchaVerifier) {
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
                if(window.recaptchaVerifier) {
                    window.recaptchaVerifier.render().then(widgetId => grecaptcha.reset(widgetId));
                }
            });
    });

    // -- 4. Verify OTP --
    otpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = document.getElementById('otpCode').value;
        const errorEl = document.getElementById('login-error'); 
        
        if(!window.confirmationResult) return;

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
        if(e.target && e.target.id == 'save-config-btn') {
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
        if(e.target && (e.target.id == 'publish-btn' || e.target.closest('#publish-btn'))) {
             publishArticle();
        }
    });

    // Project List Init
    const projectList = document.getElementById('project-list');
    if(projectList) {
        // defined below
    }
});


// -- Dashboard Logic Helper Functions --
let quill;
let jsonEditor;

function initDashboard() {
    loadProjects();
    initQuill();
    initJsonEditor();
}

function initQuill() {
    if(quill) return;
    const editorEl = document.getElementById('editor-container');
    if(!editorEl) return;

    quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: 'Write something amazing...',
        modules: {
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image', 'clean']
                ],
                handlers: {
                    'image': selectLocalImage
                }
            }
        }
    });
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
    if(jsonEditor) return;
    const container = document.getElementById("jsoneditor");
    if(!container) return;

    const options = {
        mode: 'tree',
        modes: ['code', 'tree'], 
    };
    jsonEditor = new JSONEditor(container, options);

    // Fetch initial data
    db.collection('content').doc('main').get().then((doc) => {
        if (doc.exists) {
            jsonEditor.set(doc.data());
        } else {
            jsonEditor.set({ error: "No data found" });
        }
    });
}


async function publishArticle() {
    const title = document.getElementById('post-title').value;
    const content = quill.root.innerHTML;
    const uploadStatus = document.getElementById('upload-status');

    if(!title.trim()) {
        alert("Please enter a title");
        return;
    }

    if(content === '<p><br></p>') {
        alert("Please write some content");
        return;
    }

    uploadStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';

    try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = content;
        let preview = tempDiv.textContent || tempDiv.innerText || "";
        preview = preview.substring(0, 300) + (preview.length > 300 ? "..." : "");

        await db.collection('projects').add({
            title: title,
            htmlContent: content,
            previewText: preview,
            type: 'article',
            date: new Date().toISOString().split('T')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        uploadStatus.innerHTML = '<span style="color: #00ff00;">Article Published!</span>';
        
        document.getElementById('post-title').value = '';
        quill.setContents([]);
        setTimeout(() => uploadStatus.innerHTML = '', 3000);
        
        // Refresh list
    } catch (e) {
        console.error(e);
        uploadStatus.innerHTML = `<span style="color: red;">Error: ${e.message}</span>`;
    }
}

// Global project loader - accessible to initDashboard
function loadProjects() {
    const projectList = document.getElementById('project-list');
    if(!projectList) return;

    db.collection('projects').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        projectList.innerHTML = '';
        if(snapshot.empty) {
            projectList.innerHTML = '<div style="color: var(--text-muted); text-align: center;">No posts yet. Write one!</div>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'project-item';
            
            div.innerHTML = `
                <div style="flex: 1; overflow: hidden; margin-right: 1rem;">
                    <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.title}</div>
                    <small style="color: var(--text-muted);">${data.date}</small>
                </div>
                <button class="btn btn-outline" style="padding: 0.5rem; border-color: #ef4444; color: #ef4444;" onclick="deleteProject('${doc.id}', '${data.filename || ''}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            projectList.appendChild(div);
        });
    });
}

// Delete needs to be global for onclick in innerHTML
window.deleteProject = async (docId, filename) => {
    if(!confirm('Delete this post?')) return;
    try {
        if(filename) await storage.ref(`projects/${filename}`).delete().catch(e => console.warn("File not found or already deleted"));
        await db.collection('projects').doc(docId).delete();
    } catch(err) {
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
    if(tabEls[tabs[tabId]]) tabEls[tabs[tabId]].classList.add('active');
};
