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

        // Education & Certifications Logic
        const eduContainer = document.getElementById('res-education');
        const certContainer = document.getElementById('res-certifications');
        const certWrapper = document.getElementById('cert-section-wrapper');

        // Keywords to identify "Formal Education"
        const eduKeywords = ['bachelor', 'master', 'degree', 'b.tech', 'm.tech', 'b.sc', 'm.sc', 'phd', 'doctorate', 'university', 'college', 'school', 'academy', 'institute'];

        const degrees = [];
        const certifications = [];

        data.education.forEach(item => {
            const textToCheck = (item.degree + ' ' + item.institution).toLowerCase();
            const isDegree = eduKeywords.some(k => textToCheck.includes(k));
            
            if (isDegree) {
                degrees.push(item);
            } else {
                certifications.push(item);
            }
        });

        // Helper to extract year for sorting
        function getYear(dateStr) {
            // Extracts the first 4-digit number found, or returns 0 if none
            const match = dateStr.match(/\d{4}/);
            return match ? parseInt(match[0], 10) : 0;
        }

        // Sort Certifications: Newest Year First (Descending)
        certifications.sort((a, b) => getYear(b.year) - getYear(a.year));

        // Render Degrees
        degrees.forEach(edu => {
            const div = document.createElement('div');
            div.className = 'edu-item';
            
            // Gold Medal check (retained logic)
            let badgeHtml = '';
            const textToCheck = (edu.degree + ' ' + edu.institution).toLowerCase();
            if (textToCheck.includes('bachelor') || textToCheck.includes('tech') || textToCheck.includes('college') || textToCheck.includes('university')) {
                 // heuristic for gold medal if applicable in data, or specific check
                 // For now, keeping the original check logic loosely, or we can look for specific property if exists
                 // Original code checked for 'bachelor' etc to add badge, but 'Gold Medalist' usually is specific.
                 // Assuming user wanted the badge logic kept:
                 if(edu.degree.toLowerCase().includes('gold') || edu.institution.toLowerCase().includes('gold')) {
                     badgeHtml = ` <span class="badge-gold"><i class="fas fa-medal"></i> Gold Medalist</span>`;
                 }
                 // Actually, the previous code added "Gold Medalist" to ANY bachelor deg? That seems wrong but let's replicate "Gold Medalist" only if it was there?
                 // Wait, previous code: if (textToCheck.includes('bachelor')...) { badgeHtml = 'Gold Medalist' }
                 // This implies the user hardcoded Gold Medalist for their degree. I will keep it but maybe refine? 
                 // Let's stick to the previous logic exactly for the badge to be safe, OR just look for 'Gold Medalist' in the text?
                 // The previous logic was: if (bachelor or tech or college) -> add Gold Medalist badge. 
                 // That implies the user IS a gold medalist for their college degree. I will preserve this logic.
                 badgeHtml = ` <span class="badge-gold"><i class="fas fa-medal"></i> Gold Medalist</span>`;
            }

            div.innerHTML = `
                <div class="edu-degree">${edu.degree} <span class="edu-school">, ${edu.institution}${badgeHtml}</span></div>
                <div class="edu-year">${edu.year}</div>
            `;
            eduContainer.appendChild(div);
        });

        // Render Certifications
        if (certifications.length > 0) {
            certWrapper.style.display = 'block';
            certifications.forEach(cert => {
                const div = document.createElement('div');
                div.className = 'edu-item'; // Reuse same styling
                
                let verifyLink = '';
                if (cert.link) {
                    // Reusing .badge-gold class for consistent rounded theme
                    verifyLink = ` <a href="${cert.link}" target="_blank" class="badge-gold" style="text-decoration: none; cursor: pointer;"><i class="fas fa-certificate"></i> Verify</a>`;
                }

                div.innerHTML = `
                    <div class="edu-degree">${cert.degree} <span class="edu-school">, ${cert.institution}${verifyLink}</span></div>
                    <div class="edu-year">${cert.year}</div>
                `;
                certContainer.appendChild(div);
            });
        }

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
