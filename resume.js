document.addEventListener('DOMContentLoaded', async () => {
    try {
        const doc = await db.collection('content').doc('main').get();
        if (!doc.exists) {
            alert("No data found!");
            return;
        }
        const data = doc.data();

        // Header
        document.title = `Resume - ${data.personalInfo.name}`;
        document.getElementById('res-name').textContent = data.personalInfo.name;
        document.getElementById('res-title').textContent = data.personalInfo.title;

        const emailLink = document.getElementById('res-email');
        emailLink.href = `mailto:${data.personalInfo.email}`;
        document.getElementById('txt-email').textContent = data.personalInfo.email;

        const phoneLink = document.getElementById('res-phone');
        phoneLink.href = `tel:${data.personalInfo.phone}`;
        document.getElementById('txt-phone').textContent = data.personalInfo.phone;

        document.getElementById('res-linkedin').href = data.personalInfo.linkedin;

        // Github/Web optional check
        const githubContainer = document.getElementById('github-container');
        if (data.social && data.social.github) {
            const githubLink = document.getElementById('res-github');
            githubLink.href = data.social.github;
            // Display clean URL without protocol
            githubLink.textContent = data.social.github.replace(/^https?:\/\//, '');
            if (githubContainer) githubContainer.style.display = 'flex';
        } else {
            if (githubContainer) githubContainer.style.display = 'none';
        }

        // Summary
        document.getElementById('res-summary').innerHTML = data.about.summary;

        // Experience
        const expContainer = document.getElementById('res-experience');
        data.experience.forEach(job => {
            const div = document.createElement('div');
            div.className = 'exp-item';
            // Safe detail mapping
            const detailsHtml = (job.details || []).map(d => `<li>${d}</li>`).join('');

            div.innerHTML = `
                <div class="exp-header">
                    <div class="exp-role-company">
                        <span class="exp-role">${job.role}</span> | <span class="company">${job.company}</span>
                    </div>
                    <div class="exp-date">${job.date}</div>
                </div>
                <ul class="exp-details">
                    ${detailsHtml}
                </ul>
            `;
            expContainer.appendChild(div);
        });

        // Education
        const eduContainer = document.getElementById('res-education');
        data.education.forEach(edu => {
            const div = document.createElement('div');
            div.className = 'edu-item';
            // Add badge if it is a technology degree (heuristic for college) or institution name contains key terms
            let badgeHtml = '';
            const textToCheck = (edu.degree + ' ' + edu.institution).toLowerCase();
            if (textToCheck.includes('bachelor') || textToCheck.includes('tech') || textToCheck.includes('college') || textToCheck.includes('university')) {
                badgeHtml = ` <span class="badge-gold"><i class="fas fa-medal"></i> Gold Medalist</span>`;
            }

            div.innerHTML = `
                <div class="edu-degree">${edu.degree} <span class="edu-school">, ${edu.institution}${badgeHtml}</span></div>
                <div class="edu-year">${edu.year}</div>
            `;
            eduContainer.appendChild(div);
        });

        // Skills (Inline List)
        const skillsContainer = document.getElementById('res-skills');
        data.skills.forEach(cat => {
            const div = document.createElement('div');
            div.className = 'skill-category';
            const tags = (cat.tags || []).join(', ');
            div.innerHTML = `
                <div class="skill-label">${cat.category}</div>
                <div class="skill-list-inline">${tags}</div>
            `;
            skillsContainer.appendChild(div);
        });



    } catch (e) {
        console.error(e);
        alert("Error loading resume data.");
    }
});
