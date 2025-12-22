// Render Logic
document.addEventListener('DOMContentLoaded', async () => {
    
    // --- Render Personal Info (Skeleton or Loading state could go here) ---
    // For now we just wait for data
    
    try {
        const doc = await db.collection('content').doc('main').get();
        
        if (!doc.exists) {
            console.error("No content data found in Firestore!");
            return;
        }

        const data = doc.data();

        // --- Render Personal Info ---
        document.title = `${data.personalInfo.name} | ${data.personalInfo.title}`;

        // Header
        const heroName = document.getElementById('hero-name');
        if (heroName) {
            // Split last name for coloring
            const nameParts = data.personalInfo.name.split(' ');
            const lastName = nameParts.pop();
            const firstName = nameParts.join(' ');
            heroName.innerHTML = `${firstName} <span class="text-gradient">${lastName}</span>`;
        }

        document.getElementById('hero-title').textContent = data.personalInfo.title;
        document.getElementById('profile-img').src = data.personalInfo.image;
        document.getElementById('resume-btn').href = data.personalInfo.resume;

        // Social Links
        document.getElementById('email-btn').href = `mailto:${data.personalInfo.email}`;
        document.getElementById('phone-btn').href = `tel:${data.personalInfo.phone}`;
        document.getElementById('linkedin-btn').href = data.personalInfo.linkedin;

        // Copy right
        document.getElementById('copyright-year').textContent = new Date().getFullYear();
        document.getElementById('copyright-name').textContent = data.personalInfo.name;

        // --- Render Hero Tags ---
        const tagsContainer = document.getElementById('hero-tags');
        if(tagsContainer) {
            tagsContainer.innerHTML = ''; // clear any skeletons
            data.hero.tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = tag;
                tagsContainer.appendChild(span);
            });
        }

        // --- Render About ---
        document.getElementById('about-summary').innerHTML = data.about.summary;

        // --- Render Experience ---
        const expContainer = document.getElementById('experience-timeline');
        if(expContainer) {
            expContainer.innerHTML = '';
            data.experience.forEach((job, index) => {
                const item = document.createElement('div');
                item.className = 'timeline-item reveal';
    
                const detailsHtml = job.details.map(d => `<li>${d}</li>`).join('');
    
                item.innerHTML = `
                    <div class="timeline-dot"></div>
                    <div class="glass-card exp-card">
                        <div class="exp-role">${job.role}</div>
                        <div class="exp-company">${job.company}</div>
                        <div class="exp-date">${job.date}</div>
                        <ul class="exp-list">
                            ${detailsHtml}
                        </ul>
                    </div>
                `;
                expContainer.appendChild(item);
            });
        }

        // --- Render Skills ---
        const skillsContainer = document.getElementById('skills-grid');
        if(skillsContainer) {
            skillsContainer.innerHTML = '';
            data.skills.forEach(category => {
                const card = document.createElement('div');
                card.className = 'glass-card exp-card reveal';
    
                const tagsHtml = category.tags.map(tag => `<span class="skill-tag">${tag}</span>`).join('');
    
                card.innerHTML = `
                    <div class="skill-category">
                        <h3><i class="${category.icon}"></i> ${category.category}</h3>
                        <div class="skill-tags">
                            ${tagsHtml}
                        </div>
                    </div>
                `;
                skillsContainer.appendChild(card);
            });
        }

        // --- Render Education ---
        const eduContainer = document.getElementById('edu-grid');
        if(eduContainer) {
            eduContainer.innerHTML = '';
            data.education.forEach(edu => {
                const card = document.createElement('div');
                card.className = 'glass-card exp-card reveal';
    
                let badgesHtml = '';
                if (edu.badges && edu.badges.length > 0) {
                    badgesHtml = edu.badges.map(b => `<div class="badge">${b}</div>`).join(' ');
                }
    
                let descHtml = '';
                if (edu.description) {
                    descHtml = `<p style="margin-top: 1rem; font-size: 0.9rem; color: #ccc;">${edu.description}</p>`;
                }
    
                // Add line break if badges exist
                const splitHtml = badgesHtml ? '<br>' + badgesHtml : '';
    
                card.innerHTML = `
                    <h3>${edu.degree}</h3>
                    <div class="edu-place">${edu.institution}</div>
                    <div class="exp-date" style="margin-top: 5px;">${edu.year}</div>
                    ${splitHtml}
                    ${descHtml}
                `;
                eduContainer.appendChild(card);
            });
        }

        // --- Init Animations ---
        initAnimations();

    } catch (error) {
        console.error("Error fetching data:", error);
    }
});

function initAnimations() {
    function reveal() {
        var reveals = document.querySelectorAll(".reveal");
        for (var i = 0; i < reveals.length; i++) {
            var windowHeight = window.innerHeight;
            var elementTop = reveals[i].getBoundingClientRect().top;
            var elementVisible = 100;
            if (elementTop < windowHeight - elementVisible) {
                reveals[i].classList.add("active");
            }
        }
    }
    window.addEventListener("scroll", reveal);

    // Trigger initial reveal
    reveal();

    // Staggered title appear
    document.querySelectorAll('.section-title').forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('active');
        }, 300 * index);
    });
}
