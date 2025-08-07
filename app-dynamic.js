// Dynamic Knowledge Base App with API Integration
console.log('Dynamic Knowledge Base App starting...');

class DynamicKnowledgeBaseApp {
    constructor() {
        this.currentLanguage = 'en';
        this.knowledgeCards = [];
        this.apiBaseUrl = 'http://localhost:8080/api';
        this.init();
    }

    async init() {
        console.log('Initializing dynamic app...');
        try {
            this.setupEventListeners();
            await this.loadKnowledgeCards();
            console.log('Dynamic app initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            document.getElementById('loading').innerHTML = '<p style="color: red;">Error loading app: ' + error.message + '</p>';
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        try {
            // Language toggle buttons
            const langEnBtn = document.getElementById('lang-en');
            const langThBtn = document.getElementById('lang-th');
            
            if (langEnBtn) langEnBtn.addEventListener('click', () => this.switchLanguage('en'));
            if (langThBtn) langThBtn.addEventListener('click', () => this.switchLanguage('th'));
            
            // Refresh button
            const refreshBtn = document.getElementById('refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.refreshCards();
                    this.showNotification(this.currentLanguage === 'en' ? 'Checking for new files...' : 'กำลังตรวจสอบไฟล์ใหม่...', 2000);
                });
            }
            
            // Auto-refresh every 30 seconds
            setInterval(() => this.checkForNewFiles(), 30000);
            
            console.log('Event listeners set up successfully');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    switchLanguage(lang) {
        console.log('Switching language to:', lang);
        this.currentLanguage = lang;
        
        // Update active button
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`lang-${lang}`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Update all cards
        this.updateCardsLanguage();
    }

    updateCardsLanguage() {
        console.log('Updating cards language to:', this.currentLanguage);
        const cards = document.querySelectorAll('.knowledge-card');
        cards.forEach((card, index) => {
            const cardData = this.knowledgeCards[index];
            if (cardData) {
                this.updateCardContent(card, cardData);
            }
        });
    }

    async loadKnowledgeCards() {
        const loadingElement = document.getElementById('loading');
        const cardsContainer = document.getElementById('cards-container');
        
        console.log('Loading knowledge cards from API...');
        
        try {
            if (loadingElement) loadingElement.style.display = 'flex';
            if (cardsContainer) cardsContainer.innerHTML = '';
            
            // Fetch cards from API
            const response = await fetch(`${this.apiBaseUrl}/knowledge-cards`);
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.success && data.cards) {
                this.knowledgeCards = data.cards;
                
                // Create cards
                data.cards.forEach(cardData => {
                    this.createKnowledgeCard(cardData);
                });
                
                console.log(`Loaded ${data.cards.length} knowledge cards from API`);
                
                if (data.cards.length === 0) {
                    if (cardsContainer) {
                        cardsContainer.innerHTML = '<div class="no-cards">No PDF files found in KB folder. Add some PDF files and refresh!</div>';
                    }
                }
            } else {
                throw new Error(data.error || 'Invalid API response');
            }
            
        } catch (error) {
            console.error('Error loading knowledge cards:', error);
            if (cardsContainer) {
                cardsContainer.innerHTML = `
                    <div class="error-card">
                        <h3>⚠️ Connection Error</h3>
                        <p><strong>Unable to load knowledge cards from server.</strong></p>
                        <p>Please make sure:</p>
                        <ul>
                            <li>The Python server is running (run server.py)</li>
                            <li>Server is accessible at <code>http://localhost:8080</code></li>
                            <li>Check console for detailed error messages</li>
                        </ul>
                        <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Try Again
                        </button>
                    </div>
                `;
            }
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    async checkForNewFiles() {
        try {
            console.log('Checking for new files...');
            const response = await fetch(`${this.apiBaseUrl}/knowledge-cards`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.cards.length !== this.knowledgeCards.length) {
                    const newFileCount = data.cards.length - this.knowledgeCards.length;
                    if (newFileCount > 0) {
                        const message = this.currentLanguage === 'en' 
                            ? `${newFileCount} new file(s) detected!` 
                            : `พบไฟล์ใหม่ ${newFileCount} ไฟล์!`;
                        this.showNotification(message, 4000);
                        // Don't auto-reload, let user click refresh
                    }
                }
            }
        } catch (error) {
            console.log('Auto-check failed (server may be down):', error.message);
        }
    }

    createKnowledgeCard(cardData) {
        console.log('Creating knowledge card for:', cardData.title);
        const cardsContainer = document.getElementById('cards-container');
        if (!cardsContainer) {
            console.error('Cards container not found!');
            return;
        }
        
        const card = document.createElement('div');
        card.className = 'knowledge-card';
        
        this.updateCardContent(card, cardData);
        cardsContainer.appendChild(card);
    }

    updateCardContent(card, cardData) {
        const lang = this.currentLanguage;
        const cardId = cardData.filename.replace(/[^a-zA-Z0-9]/g, '_');
        
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${cardData.title}</h3>
                ${cardData.processed_at ? `<small class="processed-time">Processed: ${new Date(cardData.processed_at).toLocaleString()}</small>` : ''}
            </div>
            
            <div class="card-section">
                <div class="section-title">
                    📄 ${lang === 'en' ? 'Summary' : 'สรุป'}
                </div>
                <div class="section-content summary-content">
                    <div class="summary-short" id="summary-short-${cardId}">
                        ${cardData.summary[lang].short}
                        <button class="read-more-btn" onclick="app.toggleSummary('${cardId}', true)">
                            ${lang === 'en' ? 'Read More' : 'อ่านเพิ่มเติม'}
                        </button>
                    </div>
                    <div class="summary-detailed hidden" id="summary-detailed-${cardId}">
                        ${cardData.summary[lang].detailed}
                        <button class="read-less-btn" onclick="app.toggleSummary('${cardId}', false)">
                            ${lang === 'en' ? 'Read Less' : 'อ่านน้อยลง'}
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="card-section">
                <div class="section-title">
                    💡 ${lang === 'en' ? 'Key Insights' : 'ข้อมูลเชิงลึกสำคัญ'}
                </div>
                <div class="section-content insights-content">
                    <ul>
                        ${cardData.insights[lang].map(insight => `<li>${insight}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <div class="card-section">
                <div class="section-title">
                    🎧 ${lang === 'en' ? 'Podcast' : 'พอดแคสต์'}
                </div>
                <div class="section-content podcast-section">
                    ${cardData.podcast_file ? 
                        `<audio class="audio-player" controls>
                            <source src="${cardData.podcast_file}" type="audio/wav">
                            <source src="${cardData.podcast_file.replace('.wav', '.mp3')}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                        <p class="audio-filename">🎵 ${cardData.podcast_file}</p>` :
                        '<div class="no-podcast">ยังไม่พบ file podcast เรื่องนี้</div>'
                    }
                </div>
            </div>
        `;
    }

    toggleSummary(cardId, showDetailed) {
        console.log('Toggling summary for card:', cardId, 'show detailed:', showDetailed);
        const shortDiv = document.getElementById(`summary-short-${cardId}`);
        const detailedDiv = document.getElementById(`summary-detailed-${cardId}`);
        
        if (shortDiv && detailedDiv) {
            if (showDetailed) {
                shortDiv.classList.add('hidden');
                detailedDiv.classList.remove('hidden');
            } else {
                shortDiv.classList.remove('hidden');
                detailedDiv.classList.add('hidden');
            }
            console.log('Summary toggled successfully');
        } else {
            console.error('Could not find summary elements for card:', cardId);
        }
    }

    async refreshCards() {
        console.log('Refreshing cards from API...');
        try {
            const previousCount = this.knowledgeCards.length;
            await this.loadKnowledgeCards();
            const newCount = this.knowledgeCards.length;
            
            if (newCount > previousCount) {
                const message = this.currentLanguage === 'en' 
                    ? `${newCount - previousCount} new file(s) loaded!` 
                    : `โหลดไฟล์ใหม่ ${newCount - previousCount} ไฟล์!`;
                this.showNotification(message, 3000);
            } else if (newCount === previousCount) {
                const message = this.currentLanguage === 'en' 
                    ? 'No new files found' 
                    : 'ไม่พบไฟล์ใหม่';
                this.showNotification(message, 2000);
            }
        } catch (error) {
            console.error('Error refreshing cards:', error);
            this.showNotification(
                this.currentLanguage === 'en' ? 'Error refreshing files' : 'เกิดข้อผิดพลาดในการรีเฟรชไฟล์',
                3000
            );
        }
    }
    
    showNotification(message, duration = 3000) {
        console.log('Showing notification:', message);
        const notification = document.getElementById('new-file-notification');
        const notificationText = document.getElementById('notification-text');
        
        if (notification && notificationText) {
            notificationText.textContent = message;
            notification.classList.remove('hidden');
            
            setTimeout(() => {
                notification.classList.add('hidden');
            }, duration);
        }
    }
}

// Initialize the app when DOM is loaded  
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing Dynamic Knowledge Base App');
    try {
        app = new DynamicKnowledgeBaseApp();
        window.app = app; // Make globally accessible
        console.log('Dynamic app initialization completed');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = '<p style="color: red;">Failed to initialize app: ' + error.message + '</p>';
        }
    }
});

console.log('Dynamic Knowledge Base App script loaded');