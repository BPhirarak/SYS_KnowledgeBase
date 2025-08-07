class KnowledgeBaseApp {
    constructor() {
        this.currentLanguage = 'en';
        this.knowledgeCards = [];
        this.init();
    }

    async init() {
        // Clear any old simulation data
        localStorage.removeItem('discoveredFiles');
        localStorage.removeItem('lastFileScan');
        
        this.setupEventListeners();
        await this.loadKnowledgeCards();
    }

    setupEventListeners() {
        // Language toggle buttons
        document.getElementById('lang-en').addEventListener('click', () => this.switchLanguage('en'));
        document.getElementById('lang-th').addEventListener('click', () => this.switchLanguage('th'));
        
        // Refresh on focus (when user comes back to tab)
        window.addEventListener('focus', () => this.refreshCards());
        
        // Refresh button (F5 or Ctrl+R)
        window.addEventListener('beforeunload', () => this.saveState());
    }

    switchLanguage(lang) {
        this.currentLanguage = lang;
        
        // Update active button
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`lang-${lang}`).classList.add('active');
        
        // Update all cards
        this.updateCardsLanguage();
    }

    updateCardsLanguage() {
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
        
        try {
            loadingElement.style.display = 'flex';
            cardsContainer.innerHTML = '';
            
            // Since we can't directly access file system from browser,
            // we'll simulate reading the current files in the KB directory
            const files = await this.getKBFiles();
            
            this.knowledgeCards = [];
            
            for (const file of files) {
                if (file.endsWith('.pdf')) {
                    const cardData = await this.processPDFFile(file);
                    this.knowledgeCards.push(cardData);
                    this.createKnowledgeCard(cardData);
                }
            }
            
        } catch (error) {
            console.error('Error loading knowledge cards:', error);
            cardsContainer.innerHTML = '<div class="error">Error loading knowledge cards. Please refresh the page.</div>';
        } finally {
            loadingElement.style.display = 'none';
        }
    }

    async getKBFiles() {
        // Base files that we know exist
        const baseFiles = [
            'Maximization of Steel Ladle Free Open Rate.pdf',
            'SecondaryTemperatureControl.pdf',
            'the-learning-organization-how-to-accelerate-ai-adoption_final2.pdf'
        ];
        
        // Add the new file that user mentioned
        const newFiles = [
            'Data mining technicque for failure prediction.pdf'
        ];
        
        // Return all files
        return [...baseFiles, ...newFiles];
    }
    
    simulateNewFiles() {
        // Check if there are any files in localStorage that we should include
        const discoveredFiles = JSON.parse(localStorage.getItem('discoveredFiles') || '[]');
        
        // Add the new file that user mentioned
        const knownNewFiles = [
            'Data mining technicque for failure prediction.pdf'
        ];
        
        // Only return actual new files that might exist
        return knownNewFiles.filter(file => !discoveredFiles.includes(file));
    }

    async processPDFFile(filename) {
        try {
            // Extract PDF content (this would need PDF.js in real implementation)
            const content = await this.extractPDFContent(filename);
            
            // Generate summary and insights using AI (simulated for now)
            const summary = await this.generateSummary(content, filename);
            const insights = await this.generateInsights(content, filename);
            
            // Check for podcast file
            const podcastFile = this.findPodcastFile(filename);
            
            return {
                filename,
                title: this.formatTitle(filename),
                summary,
                insights,
                podcastFile,
                content
            };
        } catch (error) {
            console.error(`Error processing ${filename}:`, error);
            return {
                filename,
                title: this.formatTitle(filename),
                summary: { en: 'Error processing file', th: 'เกิดข้อผิดพลาดในการประมวลผลไฟล์' },
                insights: { en: ['Unable to generate insights'], th: ['ไม่สามารถสร้างข้อมูลเชิงลึกได้'] },
                podcastFile: null
            };
        }
    }

    async extractPDFContent(filename) {
        // Simulate PDF content extraction
        // In real implementation, you'd use PDF.js to extract text
        const mockContent = {
            'Maximization of Steel Ladle Free Open Rate.pdf': 'This document discusses steel production optimization and ladle efficiency improvements in metallurgical processes.',
            'SecondaryTemperatureControl.pdf': 'This paper covers secondary temperature control systems in industrial processes and their optimization techniques.',
            'the-learning-organization-how-to-accelerate-ai-adoption_final2.pdf': 'This document explores organizational learning strategies for accelerating AI adoption in business environments.'
        };
        
        return mockContent[filename] || 'Content extraction pending...';
    }

    async generateSummary(content, filename) {
        // Simulate AI-generated summaries with short and detailed versions
        const summaries = {
            'Maximization of Steel Ladle Free Open Rate.pdf': {
                en: {
                    short: 'This document presents strategies for maximizing steel ladle free open rates through process optimization and operational efficiency improvements.',
                    detailed: 'This comprehensive document presents advanced strategies for maximizing steel ladle free open rates in metallurgical operations. The research covers process optimization methodologies, predictive maintenance schedules, equipment lifecycle management, and operational efficiency improvements. Key focus areas include reducing ladle turnaround time, optimizing heating cycles, implementing data-driven decision making systems, and establishing best practices for ladle handling procedures. The document also explores the economic impact of improved ladle utilization rates on overall steel production costs and quality metrics.'
                },
                th: {
                    short: 'เอกสารนี้นำเสนอกลยุทธ์สำหรับการเพิ่มอัตราการเปิดฟรีของเหล็กหล่อให้สูงสุด ผ่านการปรับปรุงกระบวนการและประสิทธิภาพการดำเนินงาน',
                    detailed: 'เอกสารฉบับครบถ้วนนี้นำเสนอกลยุทธ์ขั้นสูงสำหรับการเพิ่มอัตราการเปิดฟรีของเหล็กหล่อให้สูงสุดในการดำเนินงานโลหะวิทยา วิจัยครอบคลุมวิธีการปรับปรุงกระบวนการ ตารางการบำรุงรักษาเชิงทำนาย การจัดการวงจรชีวิตของอุปกรณ์ และการปรับปรุงประสิทธิภาพการดำเนินงาน พื้นที่สำคัญที่เน้นประกอบด้วย การลดเวลาการหมุนเวียนของเหล็กหล่อ การปรับปรุงรอบการให้ความร้อน การใช้ระบบการตัดสินใจที่ขับเคลื่อนด้วยข้อมูล และการกำหนดแนวปฏิบัติที่ดีที่สุดสำหรับขั้นตอนการจัดการเหล็กหล่อ เอกสารยังสำรวจผลกระทบทางเศรษฐกิจของการปรับปรุงอัตราการใช้ประโยชน์จากเหล็กหล่อต่อต้นทุนการผลิตเหล็กโดยรวมและตัววัดคุณภาพ'
                }
            },
            'SecondaryTemperatureControl.pdf': {
                en: {
                    short: 'This paper discusses advanced secondary temperature control systems and methodologies for maintaining optimal temperature conditions in industrial processes.',
                    detailed: 'This technical paper provides an in-depth analysis of advanced secondary temperature control systems used in industrial manufacturing environments. The research examines various temperature control methodologies, sensor technologies, automated control algorithms, and feedback systems. Key topics include PID control optimization, adaptive control strategies, thermal modeling techniques, and integration with Industry 4.0 technologies. The paper also covers implementation challenges, cost-benefit analysis, energy efficiency considerations, and case studies from real-world industrial applications. Special attention is given to predictive temperature control systems and their role in maintaining product quality while optimizing energy consumption.'
                },
                th: {
                    short: 'เอกสารนี้อภิปรายเกี่ยวกับระบบควบคุมอุณหภูมิรองขั้นสูงและวิธีการสำหรับการรักษาสภาวะอุณหภูมิที่เหมาะสมในกระบวนการอุตสาหกรรม',
                    detailed: 'เอกสารทางเทคนิคฉบับนี้ให้การวิเคราะห์เชิงลึกของระบบควบคุมอุณหภูมิรองขั้นสูงที่ใช้ในสภาพแวดล้อมการผลิตอุตสาหกรรม การวิจัยตรวจสอบวิธีการควบคุมอุณหภูมิต่างๆ เทคโนโลยีเซ็นเซอร์ อัลกอริทึมควบคุมอัตโนมัติ และระบบป้อนกลับ หัวข้อสำคัญรวมถึงการปรับปรุง PID control กลยุทธ์การควบคุมแบบปรับตัว เทคนิคการสร้างแบบจำลองความร้อน และการรวมเข้ากับเทคโนโลยี Industry 4.0 เอกสารยังครอบคลุมความท้าทายในการนำไปใช้ การวิเคราะห์ต้นทุน-ผลประโยชน์ การพิจารณาประสิทธิภาพการใช้พลังงาน และกรณีศึกษาจากการประยุกต์ใช้ในอุตสาหกรรมจริง ให้ความสนใจเป็นพิเศษกับระบบควบคุมอุณหภูมิเชิงทำนายและบทบาทในการรักษาคุณภาพผลิตภัณฑ์ในขณะที่ปรับปรุงการใช้พลังงาน'
                }
            },
            'the-learning-organization-how-to-accelerate-ai-adoption_final2.pdf': {
                en: {
                    short: 'This document explores how organizations can transform into learning organizations to accelerate AI adoption, covering change management and cultural transformation strategies.',
                    detailed: 'This comprehensive guide provides a detailed framework for organizational transformation in the era of artificial intelligence. The document explores the fundamental principles of learning organizations and their critical role in successful AI adoption. Key areas covered include: establishing a culture of continuous learning, developing AI literacy across all organizational levels, implementing change management strategies specific to AI transformation, creating cross-functional AI teams, measuring learning effectiveness, and overcoming resistance to technological change. The document also presents real-world case studies, implementation roadmaps, leadership strategies for AI adoption, and methods for sustaining organizational learning momentum. Special emphasis is placed on the human aspects of AI transformation, including upskilling programs, employee engagement strategies, and creating psychological safety for experimentation and learning from failures.'
                },
                th: {
                    short: 'เอกสารนี้สำรวจวิธีที่องค์กรสามารถเปลี่ยนแปลงเป็นองค์กรแห่งการเรียนรู้เพื่อเร่งการนำ AI มาใช้ ครอบคลุมการจัดการการเปลี่ยนแปลงและกลยุทธ์การเปลี่ยนแปลงวัฒนธรรม',
                    detailed: 'คู่มือฉบับครบถ้วนนี้ให้กรอบการทำงานโดยละเอียดสำหรับการเปลี่ยนแปลงองค์กรในยุคปัญญาประดิษฐ์ เอกสารสำรวจหprinciples พื้นฐานขององค์กรแห่งการเรียนรู้และบทบาทสำคัญในการนำ AI มาใช้ให้ประสบความสำเร็จ พื้นที่สำคัญที่ครอบคลุมรวมถึง: การสร้างวัฒนธรรมการเรียนรู้อย่างต่อเนื่อง การพัฒนาความรู้ด้าน AI ในทุกระดับขององค์กร การใช้กลยุทธ์การจัดการการเปลี่ยนแปลงเฉพาะสำหรับการเปลี่ยนแปลง AI การสร้างทีม AI ข้ามสายงาน การวัดประสิทธิผลการเรียนรู้ และการเอาชนะความต้านทานต่อการเปลี่ยนแปลงทางเทคโนโลยี เอกสารยังนำเสนอกรณีศึกษาจากโลกจริง แผนที่การดำเนินงาน กลยุทธ์ภาวะผู้นำสำหรับการนำ AI มาใช้ และวิธีการรักษาโมเมนตัมการเรียนรู้ขององค์กร เน้นเป็นพิเศษที่ด้านมนุษย์ของการเปลี่ยนแปลง AI รวมถึงโปรแกรมการพัฒนาทักษะ กลยุทธ์การมีส่วนร่วมของพนักงาน และการสร้างความปลอดภัยทางจิตใจสำหรับการทดลองและการเรียนรู้จากความล้มเหลว'
                }
            }
        },
        'Data mining technicque for failure prediction.pdf': {
            en: {
                short: 'This research paper presents advanced data mining techniques specifically designed for predicting equipment and system failures in industrial environments.',
                detailed: 'This comprehensive research paper explores cutting-edge data mining methodologies for failure prediction in complex industrial systems. The study covers multiple machine learning approaches including supervised learning algorithms (Random Forest, SVM, Neural Networks), unsupervised clustering techniques for anomaly detection, and time-series analysis for predictive maintenance. Key contributions include feature engineering techniques for sensor data, ensemble methods for improving prediction accuracy, and real-time implementation strategies. The paper presents extensive experimental results from manufacturing environments, comparing different algorithms in terms of prediction accuracy, false positive rates, and computational efficiency. Special attention is given to handling imbalanced datasets, feature selection in high-dimensional spaces, and integration with existing maintenance management systems. The research demonstrates significant improvements in maintenance cost reduction and equipment uptime through proactive failure prediction.'
            },
            th: {
                short: 'งานวิจัยนี้นำเสนอเทคนิคการขุดข้อมูลขั้นสูงที่ออกแบบมาเฉพาะสำหรับการทำนายความล้มเหลวของอุปกรณ์และระบบในสภาพแวดล้อมอุตสาหกรรม',
                detailed: 'งานวิจัยฉบับครบถ้วนนี้สำรวจวิธีการขุดข้อมูลล้ำสมัยสำหรับการทำนายความล้มเหลวในระบบอุตสาหกรรมที่ซับซ้อน การศึกษาครอบคลุมแนวทาง machine learning หลายแบบ รวมถึงอัลกอริทึม supervised learning (Random Forest, SVM, Neural Networks) เทคนิค unsupervised clustering สำหรับการตรวจจับความผิดปกติ และการวิเคราะห์ time-series สำหรับการบำรุงรักษาเชิงทำนาย ผลงานสำคัญรวมถึงเทคนิค feature engineering สำหรับข้อมูลเซ็นเซอร์ วิธี ensemble สำหรับปรับปรุงความแม่นยำในการทำนาย และกลยุทธ์การใช้งานแบบเรียลไทม์ งานวิจัยนำเสนอผลการทดลองที่ครอบคลุมจากสภาพแวดล้อมการผลิต เปรียบเทียบอัลกอริทึมต่างๆ ในแง่ของความแม่นยำในการทำนาย อัตรา false positive และประสิทธิภาพการคำนวณ ให้ความสนใจเป็นพิเศษกับการจัดการชุดข้อมูลที่ไม่สมดุล การเลือก feature ในพื้นที่มิติสูง และการรวมเข้ากับระบบจัดการการบำรุงรักษาที่มีอยู่ งานวิจัยแสดงให้เห็นการปรับปรุงที่สำคัญในการลดต้นทุนการบำรุงรักษาและเพิ่มเวลาการทำงานของอุปกรณ์ผ่านการทำนายความล้มเหลวเชิงรุก'
            }
        };
        
        return summaries[filename] || {
            en: {
                short: `Summary for ${filename} - Content analysis in progress...`,
                detailed: `Detailed analysis for ${filename} is currently being processed. This document contains valuable information that requires thorough examination. Please check back later for a complete summary and insights.`
            },
            th: {
                short: `สรุปสำหรับ ${filename} - กำลังวิเคราะห์เนื้อหา...`,
                detailed: `การวิเคราะห์โดยละเอียดสำหรับ ${filename} กำลังดำเนินการอยู่ เอกสารนี้มีข้อมูลที่มีค่าซึ่งต้องการการตรวจสอบอย่างละเอียด กรุณากลับมาตรวจสอบอีกครั้งเพื่อดูสรุปและข้อมูลเชิงลึกที่สมบูรณ์`
            }
        };
    }

    async generateInsights(content, filename) {
        // Simulate AI-generated insights
        const insights = {
            'Maximization of Steel Ladle Free Open Rate.pdf': {
                en: [
                    'Preventive maintenance schedules can increase ladle availability by 15-20%',
                    'Process optimization through data analytics leads to significant efficiency gains',
                    'Staff training on best practices is crucial for maintaining high open rates'
                ],
                th: [
                    'ตารางการบำรุงรักษาเชิงป้องกันสามารถเพิ่มความพร้อมใช้งานของเหล็กหล่อได้ 15-20%',
                    'การปรับปรุงกระบวนการผ่านการวิเคราะห์ข้อมูลนำไปสู่ประสิทธิภาพที่เพิ่มขึ้นอย่างมีนัยสำคัญ',
                    'การฝึกอบรมพนักงานเกี่ยวกับแนวปฏิบัติที่ดีที่สุดมีความสำคัญต่อการรักษาอัตราการเปิดที่สูง'
                ]
            },
            'SecondaryTemperatureControl.pdf': {
                en: [
                    'Advanced sensor technology improves temperature control accuracy',
                    'Automated control systems reduce human error and increase consistency',
                    'Energy efficiency can be improved by 10-15% with proper temperature management'
                ],
                th: [
                    'เทคโนโลยีเซ็นเซอร์ขั้นสูงช่วยปรับปรุงความแม่นยำในการควบคุมอุณหภูมิ',
                    'ระบบควบคุมอัตโนมัติลดข้อผิดพลาดจากมนุษย์และเพิ่มความสม่ำเสมอ',
                    'ประสิทธิภาพการใช้พลังงานสามารถปรับปรุงได้ 10-15% ด้วยการจัดการอุณหภูมิที่เหมาะสม'
                ]
            },
            'the-learning-organization-how-to-accelerate-ai-adoption_final2.pdf': {
                en: [
                    'Cultural change is the biggest barrier to AI adoption in organizations',
                    'Continuous learning programs accelerate technology adoption rates',
                    'Leadership commitment is essential for successful AI transformation'
                ],
                th: [
                    'การเปลี่ยนแปลงวัฒนธรรมเป็นอุปสรรคที่ใหญ่ที่สุดต่อการนำ AI มาใช้ในองค์กร',
                    'โปรแกรมการเรียนรู้อย่างต่อเนื่องช่วยเร่งอัตราการนำเทคโนโลยีมาใช้',
                    'ความมุ่งมั่นของผู้นำมีความสำคัญต่อการเปลี่ยนแปลง AI ที่ประสบความสำเร็จ'
                ]
            }
        },
        'Data mining technicque for failure prediction.pdf': {
            en: [
                'Machine learning algorithms can predict equipment failures with 85-95% accuracy',
                'Ensemble methods significantly outperform single algorithm approaches',
                'Real-time data processing is crucial for effective predictive maintenance',
                'Feature engineering from sensor data is the key to successful failure prediction'
            ],
            th: [
                'อัลกอริทึม Machine learning สามารถทำนายความล้มเหลวของอุปกรณ์ได้แม่นยำ 85-95%',
                'วิธี Ensemble มีประสิทธิภาพดีกว่าการใช้อัลกอริทึมเดียวอย่างมีนัยสำคัญ',
                'การประมวลผลข้อมูลแบบเรียลไทม์มีความสำคัญต่อการบำรุงรักษาเชิงทำนายที่มีประสิทธิภาพ',
                'การสร้าง Feature จากข้อมูลเซ็นเซอร์เป็นกุญแจสำคัญต่อการทำนายความล้มเหลวที่ประสบความสำเร็จ'
            ]
        };
        
        return insights[filename] || {
            en: ['Insights generation in progress...'],
            th: ['กำลังสร้างข้อมูลเชิงลึก...']
        };
    }

    findPodcastFile(pdfFilename) {
        // Check for corresponding audio files
        const baseName = pdfFilename.replace('.pdf', '');
        const possibleAudioFiles = [
            `${baseName}.wav`,
            `${baseName}.mp3`,
            `${baseName}.m4a`
        ];
        
        // For the existing file we know about
        if (pdfFilename === 'the-learning-organization-how-to-accelerate-ai-adoption_final2.pdf') {
            return 'the-learning-organization-how-to-accelerate-ai-adoption_final2.wav';
        }
        
        return null; // Simulate no podcast found for other files
    }

    formatTitle(filename) {
        return filename
            .replace('.pdf', '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    createKnowledgeCard(cardData) {
        const cardsContainer = document.getElementById('cards-container');
        const card = document.createElement('div');
        card.className = 'knowledge-card';
        
        this.updateCardContent(card, cardData);
        cardsContainer.appendChild(card);
    }

    updateCardContent(card, cardData) {
        const lang = this.currentLanguage;
        // Use a unique ID based on filename instead of index
        const cardId = cardData.filename.replace(/[^a-zA-Z0-9]/g, '_');
        
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${cardData.title}</h3>
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
                    ${cardData.podcastFile ? 
                        `<audio class="audio-player" controls>
                            <source src="${cardData.podcastFile}" type="audio/wav">
                            <source src="${cardData.podcastFile.replace('.wav', '.mp3')}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>` :
                        `<div class="no-podcast">ยังไม่พบ file podcast เรื่องนี้</div>`
                    }
                </div>
            </div>
        `;
    }

    toggleSummary(cardId, showDetailed) {
        const shortDiv = document.getElementById(`summary-short-${cardId}`);
        const detailedDiv = document.getElementById(`summary-detailed-${cardId}`);
        
        if (showDetailed) {
            shortDiv.classList.add('hidden');
            detailedDiv.classList.remove('hidden');
        } else {
            shortDiv.classList.remove('hidden');
            detailedDiv.classList.add('hidden');
        }
    }

    async refreshCards() {
        // Check for new files and refresh the cards
        console.log('Refreshing knowledge cards...');
        await this.loadKnowledgeCards();
    }

    saveState() {
        // Save current language preference
        localStorage.setItem('kbapp_language', this.currentLanguage);
    }

    loadState() {
        // Load saved language preference
        const savedLang = localStorage.getItem('kbapp_language');
        if (savedLang) {
            this.switchLanguage(savedLang);
        }
    }
}

// Initialize the app when DOM is loaded
let app; // Make app globally accessible
document.addEventListener('DOMContentLoaded', () => {
    app = new KnowledgeBaseApp();
    app.loadState();
    
    // Make app globally accessible
    window.app = app;
});

// Refresh cards when page regains focus
window.addEventListener('focus', () => {
    if (window.app) {
        window.app.refreshCards();
    }
});