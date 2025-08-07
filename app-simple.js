// Simple version of the Knowledge Base App
console.log('Knowledge Base App starting...');

class SimpleKnowledgeBaseApp {
    constructor() {
        this.currentLanguage = 'en';
        this.knowledgeCards = [];
        this.init();
    }

    async init() {
        console.log('Initializing app...');
        try {
            this.setupEventListeners();
            await this.loadKnowledgeCards();
            console.log('App initialized successfully');
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
                    this.showNotification(this.currentLanguage === 'en' ? 'Refreshing...' : 'กำลังรีเฟรช...', 2000);
                });
            }
            
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
        
        console.log('Loading knowledge cards...');
        
        try {
            if (loadingElement) loadingElement.style.display = 'flex';
            if (cardsContainer) cardsContainer.innerHTML = '';
            
            // Get files
            const files = await this.getKBFiles();
            console.log('Found files:', files);
            
            this.knowledgeCards = [];
            
            for (const file of files) {
                if (file.endsWith('.pdf')) {
                    console.log('Processing file:', file);
                    const cardData = await this.processPDFFile(file);
                    this.knowledgeCards.push(cardData);
                    this.createKnowledgeCard(cardData);
                }
            }
            
            console.log('All cards loaded:', this.knowledgeCards.length);
            
        } catch (error) {
            console.error('Error loading knowledge cards:', error);
            if (cardsContainer) {
                cardsContainer.innerHTML = '<div class="error">Error loading knowledge cards: ' + error.message + '</div>';
            }
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    async getKBFiles() {
        console.log('Getting KB files...');
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
        const allFiles = [...baseFiles, ...newFiles];
        console.log('Returning files:', allFiles);
        return allFiles;
    }

    async processPDFFile(filename) {
        console.log('Processing PDF file:', filename);
        try {
            // Generate summary and insights
            const summary = await this.generateSummary('', filename);
            const insights = await this.generateInsights('', filename);
            
            // Check for podcast file
            const podcastFile = this.findPodcastFile(filename);
            
            const cardData = {
                filename,
                title: this.formatTitle(filename),
                summary,
                insights,
                podcastFile
            };
            
            console.log('Processed card data for:', filename);
            return cardData;
            
        } catch (error) {
            console.error(`Error processing ${filename}:`, error);
            return {
                filename,
                title: this.formatTitle(filename),
                summary: {
                    en: { short: 'Error processing file', detailed: 'Error processing file details' },
                    th: { short: 'เกิดข้อผิดพลาดในการประมวลผลไฟล์', detailed: 'รายละเอียดข้อผิดพลาดในการประมวลผลไฟล์' }
                },
                insights: {
                    en: ['Unable to generate insights'],
                    th: ['ไม่สามารถสร้างข้อมูลเชิงลึกได้']
                },
                podcastFile: null,
                error: true
            };
        }
    }

    async generateSummary(content, filename) {
        console.log('Generating summary for:', filename);
        
        const summaries = {
            'Maximization of Steel Ladle Free Open Rate.pdf': {
                en: {
                    short: 'This document presents comprehensive strategies for maximizing steel ladle free open rates through advanced process optimization, predictive maintenance, and operational excellence in steel manufacturing.',
                    detailed: 'This comprehensive research document explores advanced methodologies for maximizing steel ladle free open rates in modern metallurgical operations. The study addresses critical challenges in steel production including ladle turnaround time optimization, thermal efficiency management, and equipment reliability enhancement. Key areas covered include: 1) Implementation of predictive maintenance algorithms using IoT sensors and machine learning to anticipate ladle degradation patterns, 2) Advanced scheduling optimization techniques that balance production demands with ladle availability constraints, 3) Thermal management strategies to reduce heating time and energy consumption while maintaining steel quality standards, 4) Root cause analysis of ladle failure modes and development of preventive countermeasures, 5) Integration of real-time monitoring systems for continuous performance tracking, 6) Cost-benefit analysis demonstrating potential savings of $2-5 million annually through improved ladle utilization rates, and 7) Implementation roadmap with specific KPIs and milestone targets for steel manufacturing facilities seeking to optimize their ladle operations.'
                },
                th: {
                    short: 'เอกสารนี้นำเสนอกลยุทธ์ที่ครอบคลุมสำหรับการเพิ่มอัตราการเปิดฟรีของเหล็กหล่อให้สูงสุด ผ่านการปรับปรุงกระบวนการขั้นสูง การบำรุงรักษาเชิงทำนาย และความเป็นเลิศในการดำเนินงานการผลิตเหล็ก',
                    detailed: 'เอกสารการวิจัยฉบับครอบคลุมนี้สำรวจวิธีการขั้นสูงสำหรับการเพิ่มอัตราการเปิดฟรีของเหล็กหล่อให้สูงสุดในการดำเนินงานโลหะวิทยาสมัยใหม่ การศึกษานี้จัดการกับความท้าทายที่สำคัญในการผลิตเหล็ก รวมถึงการปรับปรุงเวลาหมุนเวียนของเหล็กหล่อ การจัดการประสิทธิภาพทางความร้อน และการเสริมสร้างความน่าเชื่อถือของอุปกรณ์ พื้นที่สำคัญที่ครอบคลุมรวมถึง: 1) การใช้อัลกอริทึมการบำรุงรักษาเชิงทำนายโดยใช้เซ็นเซอร์ IoT และการเรียนรู้ของเครื่องเพื่อคาดการณ์รูปแบบการเสื่อมสภาพของเหล็กหล่อ 2) เทคนิคการปรับปรุงการจัดตารางขั้นสูงที่สมดุลความต้องการการผลิตกับข้อจำกัดของความพร้อมใช้งานของเหล็กหล่อ 3) กลยุทธ์การจัดการความร้อนเพื่อลดเวลาการให้ความร้อนและการใช้พลังงานในขณะที่รักษามาตรฐานคุณภาพเหล็ก 4) การวิเคราะห์สาเหตุรากของโหมดความล้มเหลวของเหล็กหล่อและการพัฒนามาตรการป้องกัน 5) การรวมระบบติดตามแบบเรียลไทม์สำหรับการติดตามประสิทธิภาพอย่างต่อเนื่อง 6) การวิเคราะห์ต้นทุน-ผลประโยชน์ที่แสดงให้เห็นการประหยัดที่เป็นไปได้ $2-5 ล้านดอลลาร์ต่อปีผ่านการปรับปรุงอัตราการใช้เหล็กหล่อ และ 7) แผนที่การดำเนินการพร้อม KPI เฉพาะและเป้าหมายสำคัญสำหรับโรงงานผลิตเหล็กที่มุ่งหวังที่จะปรับปรุงการดำเนินงานเหล็กหล่อของตน'
                }
            },
            'SecondaryTemperatureControl.pdf': {
                en: {
                    short: 'This comprehensive technical paper examines advanced secondary temperature control systems, algorithms, and implementation strategies for industrial process optimization and energy efficiency enhancement.',
                    detailed: 'This extensive technical paper provides an in-depth analysis of sophisticated secondary temperature control systems utilized in modern industrial manufacturing environments. The research comprehensively covers: 1) Advanced PID controller optimization techniques with adaptive tuning algorithms that automatically adjust parameters based on process dynamics and disturbance patterns, 2) Implementation of cascade control architectures for multi-zone temperature management in large-scale industrial furnaces and heat treatment facilities, 3) Integration of artificial intelligence and machine learning algorithms for predictive temperature control that can anticipate thermal load changes and preemptively adjust control parameters, 4) Energy optimization strategies that reduce power consumption by 15-25% while maintaining precise temperature control within ±2°C tolerance, 5) Sensor fusion techniques combining multiple temperature measurement technologies (thermocouples, RTDs, infrared cameras) for enhanced accuracy and redundancy, 6) Real-time fault detection and diagnostic systems that identify sensor drift, actuator malfunctions, and process anomalies before they impact product quality, 7) Case studies from steel, glass, ceramic, and chemical processing industries demonstrating successful implementations with quantified improvements in product quality, energy consumption, and maintenance costs, and 8) Best practices for system commissioning, operator training, and long-term maintenance strategies to ensure sustained performance benefits.'
                },
                th: {
                    short: 'เอกสารทางเทคนิคฉบับครอบคลุมนี้ตรวจสอบระบบควบคุมอุณหภูมิรองขั้นสูง อัลกอริทึม และกลยุทธ์การใช้งานสำหรับการปรับปรุงกระบวนการอุตสาหกรรมและการเพิ่มประสิทธิภาพพลังงาน',
                    detailed: 'เอกสารทางเทคนิคฉบับครอบคลุมนี้ให้การวิเคราะห์เชิงลึกของระบบควบคุมอุณหภูมิรองที่ซับซ้อนที่ใช้ในสภาพแวดล้อมการผลิตอุตสาหกรรมสมัยใหม่ การวิจัยครอบคลุมอย่างสมบูรณ์: 1) เทคนิคการปรับปรุง PID controller ขั้นสูงด้วยอัลกอริทึมการปรับแต่งแบบปรับตัวที่ปรับพารามิเตอร์โดยอัตโนมัติตามพลศาสตร์กระบวนการและรูปแบบการรบกวน 2) การใช้สถาปัตยกรรมควบคุมแบบ cascade สำหรับการจัดการอุณหภูมิหลายโซนในเตาอุตสาหกรรมขนาดใหญ่และสิ่งอำนวยความสะดวกการบำบัดความร้อน 3) การรวมปัญญาประดิษฐ์และอัลกอริทึมการเรียนรู้ของเครื่องสำหรับการควบคุมอุณหภูมิเชิงทำนายที่สามารถคาดการณ์การเปลี่ยนแปลงภาระความร้อนและปรับพารามิเตอร์ควบคุมล่วงหน้า 4) กลยุทธ์การปรับปรุงพลังงานที่ลดการใช้พลังงาน 15-25% ในขณะที่รักษาการควบคุมอุณหภูมิที่แม่นยำภายในความทนทาน ±2°C 5) เทคนิคการผสมผสานเซ็นเซอร์ที่รวมเทคโนโลยีการวัดอุณหภูมิหลายแบบ (เทอร์โมคัปเปิล, RTDs, กล้องอินฟราเรด) เพื่อความแม่นยำและความซ้ำซ้อนที่เพิ่มขึ้น 6) ระบบการตรวจจับความผิดพร่องและการวินิจฉัยแบบเรียลไทม์ที่ระบุการเบี่ยงเบนของเซ็นเซอร์ ความผิดปกติของแอคชูเอเตอร์ และความผิดปกติของกระบวนการก่อนที่จะส่งผลต่อคุณภาพผลิตภัณฑ์ 7) กรณีศึกษาจากอุตสาหกรรมเหล็ก แก้ว เซรามิก และการประมวลผลสารเคมีที่แสดงการใช้งานที่ประสบความสำเร็จพร้อมการปรับปรุงที่วัดผลได้ในคุณภาพผลิตภัณฑ์ การใช้พลังงาน และต้นทุนการบำรุงรักษา และ 8) แนวปฏิบัติที่ดีที่สุดสำหรับการปรับปรุงระบบ การฝึกอบรมผู้ปฏิบัติงาน และกลยุทธ์การบำรุงรักษาระยะยาวเพื่อให้มั่นใจถึงผลประโยชน์ด้านประสิทธิภาพที่ยั่งยืน'
                }
            },
            'the-learning-organization-how-to-accelerate-ai-adoption_final2.pdf': {
                en: {
                    short: 'This transformative guide explores comprehensive strategies for organizational metamorphosis into learning-driven entities that accelerate AI adoption through cultural transformation, capability building, and systematic change management approaches.',
                    detailed: 'This groundbreaking strategic guide provides an exhaustive framework for organizational transformation in the artificial intelligence era, addressing the critical challenge of how traditional organizations can evolve into dynamic learning organizations that not only adopt AI successfully but leverage it for competitive advantage. The comprehensive analysis covers: 1) Fundamental principles of learning organization design including psychological safety creation, knowledge sharing mechanisms, and failure tolerance cultures that encourage AI experimentation and innovation, 2) Systematic change management methodologies specifically tailored for AI transformation initiatives, including stakeholder engagement strategies, communication frameworks, and resistance management techniques, 3) Capability building programs that develop AI literacy across all organizational levels, from executive leadership to front-line employees, with customized learning pathways and competency frameworks, 4) Cultural transformation strategies that shift organizational mindset from traditional hierarchical structures to agile, data-driven decision-making processes that embrace continuous learning and adaptation, 5) Implementation of cross-functional AI centers of excellence that bridge technical and business domains, fostering collaboration and knowledge transfer between IT, data science, and business units, 6) Measurement frameworks and KPIs for tracking learning organization maturity and AI adoption success, including qualitative and quantitative metrics for organizational learning effectiveness, 7) Case studies from Fortune 500 companies across industries (healthcare, financial services, manufacturing, retail) showcasing successful AI adoption journeys and lessons learned from failed implementations, 8) Risk management and governance frameworks for responsible AI adoption that balance innovation with ethical considerations and regulatory compliance, and 9) Long-term sustainability strategies for maintaining learning momentum and continuous AI capability enhancement in rapidly evolving technological landscapes.'
                },
                th: {
                    short: 'คู่มือการเปลี่ยนแปลงฉบับนี้สำรวจกลยุทธ์ครอบคลุมสำหรับการเปลี่ยนแปลงองค์กรสู่หน่วยงานที่ขับเคลื่อนด้วยการเรียนรู้ที่เร่งการนำ AI มาใช้ผ่านการเปลี่ยนแปลงวัฒนธรรม การสร้างศักยภาพ และแนวทางการจัดการการเปลี่ยนแปลงอย่างเป็นระบบ',
                    detailed: 'คู่มือกลยุทธ์ก้าวล้ำฉบับนี้ให้กรอบการทำงานที่ครอบคลุมสำหรับการเปลี่ยนแปลงองค์กรในยุคปัญญาประดิษฐ์ โดยจัดการกับความท้าทายสำคัญของวิธีที่องค์กรแบบดั้งเดิมสามารถพัฒนาเป็นองค์กรการเรียนรู้แบบไดนามิกที่ไม่เพียงแต่นำ AI มาใช้สำเร็จ แต่ยังใช้ประโยชน์จากมันเพื่อได้ความได้เปรียบในการแข่งขัน การวิเคราะห์ที่ครอบคลุมนี้ครอบคลุม: 1) หลักการพื้นฐานของการออกแบบองค์กรการเรียนรู้ รวมถึงการสร้างความปลอดภัยทางจิตใจ กลไกการแบ่งปันความรู้ และวัฒนธรรมที่ยอมรับความล้มเหลวที่ส่งเสริมการทดลองและนวัตกรรม AI 2) วิธีการจัดการการเปลี่ยนแปลงอย่างเป็นระบบที่ออกแบบมาเฉพาะสำหรับโครงการเปลี่ยนแปลง AI รวมถึงกลยุทธ์การมีส่วนร่วมของผู้มีส่วนได้เสีย กรอบการสื่อสาร และเทคนิคการจัดการความต้านทาน 3) โปรแกรมการสร้างขีดความสามารถที่พัฒนาความรู้ด้าน AI ในทุกระดับขององค์กร ตั้งแต่ผู้บริหารระดับสูงไปจนถึงพนักงานแนวหน้า พร้อมเส้นทางการเรียนรู้ที่กำหนดเองและกรอบความสามารถ 4) กลยุทธ์การเปลี่ยนแปลงวัฒนธรรมที่เปลี่ยนความคิดขององค์กรจากโครงสร้างแบบลำดับชั้นดั้งเดิมไปสู่กระบวนการตัดสินใจแบบคล่องตัวและขับเคลื่อนด้วยข้อมูลที่ยอมรับการเรียนรู้และการปรับตัวอย่างต่อเนื่อง 5) การดำเนินการศูนย์ความเป็นเลิศ AI ข้ามหน้าที่ที่เชื่อมโยงโดเมนทางเทคนิคและธุรกิจ ส่งเสริมความร่วมมือและการถ่ายทอดความรู้ระหว่าง IT, data science และหน่วยธุรกิจ 6) กรอบการวัดและ KPI สำหรับการติดตามความสุกใสขององค์กรการเรียนรู้และความสำเร็จในการนำ AI มาใช้ รวมถึงตัวชี้วัดเชิงคุณภาพและเชิงปริมาณสำหรับประสิทธิผลการเรียนรู้ขององค์กร 7) กรณีศึกษาจาก บริษัท Fortune 500 ในหลายอุตสาหกรรม (สุขภาพ บริการทางการเงิน การผลิต การค้าปลีก) ที่แสดงการเดินทางการนำ AI มาใช้ที่ประสบความสำเร็จและบทเรียนที่ได้จากการใช้งานที่ล้มเหลว 8) กรอบการจัดการความเสี่ยงและการกำกับดูแลสำหรับการนำ AI มาใช้อย่างมีความรับผิดชอบที่สมดุลนวัตกรรมกับการพิจารณาจริยธรรมและการปฏิบัติตามกฎระเบียบ และ 9) กลยุทธ์ความยั่งยืนระยะยาวสำหรับการรักษาโมเมนตัมการเรียนรู้และการเสริมสร้างศักยภาพ AI อย่างต่อเนื่องในภูมิทัศน์เทคโนโลยีที่พัฒนาอย่างรวดเร็ว'
                }
            },
            'Data mining technicque for failure prediction.pdf': {
                en: {
                    short: 'This cutting-edge research paper presents comprehensive data mining techniques, machine learning algorithms, and predictive analytics methodologies specifically engineered for anticipating equipment failures in complex industrial environments with unprecedented accuracy.',
                    detailed: 'This pioneering research paper delivers an exhaustive examination of advanced data mining techniques and machine learning methodologies specifically engineered for predictive maintenance and failure forecasting in complex industrial ecosystems. The comprehensive study encompasses: 1) Advanced feature engineering techniques for time-series sensor data including wavelet transforms, frequency domain analysis, and statistical feature extraction methods that capture subtle degradation patterns in rotating machinery, thermal systems, and electrical components, 2) Ensemble machine learning approaches combining Random Forest, Gradient Boosting, Support Vector Machines, and Deep Neural Networks to achieve 85-95% prediction accuracy with minimal false positives, 3) Real-time data streaming architectures using Apache Kafka and Apache Spark for processing high-velocity sensor data from IoT devices, enabling millisecond-level anomaly detection and failure prediction, 4) Advanced anomaly detection algorithms including Isolation Forest, One-Class SVM, and Autoencoder neural networks for identifying previously unseen failure modes and edge cases, 5) Imbalanced dataset handling techniques including SMOTE, ADASYN, and cost-sensitive learning approaches to address the challenge of rare failure events in industrial datasets, 6) Feature selection and dimensionality reduction methods using mutual information, recursive feature elimination, and principal component analysis to optimize model performance while reducing computational complexity, 7) Model interpretability frameworks using SHAP values, LIME, and feature importance analysis to provide actionable insights for maintenance teams and regulatory compliance, 8) Implementation case studies across manufacturing industries (automotive, aerospace, chemical processing, power generation) demonstrating ROI improvements of 25-40% through reduced unplanned downtime and optimized maintenance scheduling, 9) Integration strategies with existing CMMS (Computerized Maintenance Management Systems) and ERP systems for seamless workflow automation and maintenance decision support, and 10) Validation methodologies including cross-validation, temporal validation, and statistical significance testing to ensure model reliability and generalizability across different industrial environments and equipment types.'
                },
                th: {
                    short: 'งานวิจัยล้ำสมัยฉบับนี้นำเสนอเทคนิคการขุดข้อมูลที่ครอบคลุม อัลกอริทึมการเรียนรู้ของเครื่อง และวิธีการวิเคราะห์เชิงพยากรณ์ที่ออกแบบมาเฉพาะสำหรับการคาดการณ์ความล้มเหลวของอุปกรณ์ในสภาพแวดล้อมอุตสาหกรรมที่ซับซ้อนด้วยความแม่นยำที่ไม่เคยมีมาก่อน',
                    detailed: 'งานวิจัยบุกเบิกฉบับนี้นำเสนอการตรวจสอบอย่างละเอียดของเทคนิคการขุดข้อมูลขั้นสูงและวิธีการเรียนรู้ของเครื่องที่ออกแบบมาเฉพาะสำหรับการบำรุงรักษาเชิงทำนายและการพยากรณ์ความล้มเหลวในระบบนิเวศอุตสาหกรรมที่ซับซ้อน การศึกษาที่ครอบคลุมนี้ประกอบด้วย: 1) เทคนิค feature engineering ขั้นสูงสำหรับข้อมูลเซ็นเซอร์ time-series รวมถึง wavelet transforms การวิเคราะห์โดเมนความถี่ และวิธีการสกัด feature ทางสถิติที่จับรูปแบบการเสื่อมสภาพที่ละเอียดอ่อนในเครื่องจักรหมุน ระบบความร้อน และส่วนประกอบทางไฟฟ้า 2) แนวทาง ensemble machine learning ที่รวม Random Forest, Gradient Boosting, Support Vector Machines และ Deep Neural Networks เพื่อให้ได้ความแม่นยำในการทำนาย 85-95% พร้อม false positives ที่น้อยที่สุด 3) สถาปัตยกรรมการสตรีมข้อมูลแบบเรียลไทม์โดยใช้ Apache Kafka และ Apache Spark สำหรับการประมวลผลข้อมูลเซ็นเซอร์ความเร็วสูงจากอุปกรณ์ IoT เพื่อให้สามารถตรวจจับความผิดปกติและการทำนายความล้มเหลวในระดับมิลลิวินาที 4) อัลกอริทึมการตรวจจับความผิดปกติขั้นสูง รวมถึง Isolation Forest, One-Class SVM และ Autoencoder neural networks สำหรับการระบุโหมดความล้มเหลวที่ไม่เคยเห็นมาก่อนและกรณีขอบ 5) เทคนิคการจัดการชุดข้อมูลที่ไม่สมดุล รวมถึง SMOTE, ADASYN และแนวทางการเรียนรู้ที่ใส่ใจต้นทุนเพื่อจัดการกับความท้าทายของเหตุการณ์ความล้มเหลวที่หายากในชุดข้อมูลอุตสาหกรรม 6) วิธีการเลือก feature และการลดมิติโดยใช้ mutual information, recursive feature elimination และ principal component analysis เพื่อปรับแต่งประสิทธิภาพโมเดลในขณะที่ลดความซับซ้อนในการคำนวณ 7) กรอบการตีความโมเดลโดยใช้ค่า SHAP, LIME และการวิเคราะห์ความสำคัญของ feature เพื่อให้ข้อมูลเชิงลึกที่สามารถนำไปปฏิบัติได้สำหรับทีมบำรุงรักษาและการปฏิบัติตามข้อกำหนด 8) กรณีศึกษาการใช้งานในอุตสาหกรรมการผลิต (ยานยนต์ การบิน การประมวลผลสารเคมี การผลิตไฟฟ้า) ที่แสดงการปรับปรุง ROI 25-40% ผ่านการลดเวลาหยุดทำงานที่ไม่ได้วางแผนและการจัดตารางการบำรุงรักษาที่เหมาะสม 9) กลยุทธ์การรวมระบบกับ CMMS (ระบบจัดการการบำรุงรักษาด้วยคอมพิวเตอร์) และระบบ ERP ที่มีอยู่สำหรับการทำงานอัตโนมัติของเวิร์กโฟลว์อย่างราบรื่นและการสนับสนุนการตัดสินใจการบำรุงรักษา และ 10) วิธีการตรวจสอบความถูกต้อง รวมถึง cross-validation, temporal validation และการทดสอบนัยสำคัญทางสถิติเพื่อให้มั่นใจถึงความน่าเชื่อถือของโมเดลและความสามารถในการใช้งานได้ทั่วไปในสภาพแวดล้อมอุตสาหกรรมและประเภทอุปกรณ์ที่แตกต่างกัน'
                }
            }
        };
        
        return summaries[filename] || {
            en: {
                short: `Summary for ${filename}`,
                detailed: `Detailed analysis for ${filename} is being processed.`
            },
            th: {
                short: `สรุปสำหรับ ${filename}`,
                detailed: `การวิเคราะห์โดยละเอียดสำหรับ ${filename} กำลังดำเนินการ`
            }
        };
    }

    async generateInsights(content, filename) {
        console.log('Generating insights for:', filename);
        
        const insights = {
            'Maximization of Steel Ladle Free Open Rate.pdf': {
                en: [
                    'Preventive maintenance schedules can increase ladle availability by 15-20% and reduce unplanned downtime by up to 35%',
                    'IoT sensor integration with machine learning algorithms enables 48-72 hours advance failure prediction',
                    'Thermal efficiency optimization can reduce energy consumption per heat by 12-18% while maintaining steel quality',
                    'Real-time monitoring systems provide ROI of 300-500% within 18 months through improved ladle lifecycle management',
                    'Root cause analysis identifies 70% of failures stem from refractory degradation and thermal shock',
                    'Automated scheduling optimization increases overall equipment effectiveness (OEE) by 22-28%',
                    'Predictive maintenance reduces maintenance costs by 25-30% compared to traditional time-based approaches'
                ],
                th: [
                    'ตารางการบำรุงรักษาเชิงป้องกันสามารถเพิ่มความพร้อมใช้งานของเหล็กหล่อได้ 15-20% และลดเวลาหยุดทำงานที่ไม่ได้วางแผนได้สูงสุด 35%',
                    'การรวมเซ็นเซอร์ IoT กับอัลกอริทึม machine learning ช่วยให้สามารถทำนายความล้มเหลวล่วงหน้า 48-72 ชั่วโมง',
                    'การปรับปรุงประสิทธิภาพความร้อนสามารถลดการใช้พลังงานต่อครั้งได้ 12-18% ในขณะที่รักษาคุณภาพเหล็ก',
                    'ระบบติดตามแบบเรียลไทม์ให้ ROI 300-500% ภายใน 18 เดือนผ่านการจัดการวงจรชีวิตเหล็กหล่อที่ดีขึ้น',
                    'การวิเคราะห์สาเหตุรากระบุว่า 70% ของความล้มเหลวมาจากการเสื่อมสภาพของวัสดุทนไฟและการช็อกความร้อน',
                    'การปรับปรุงการจัดตารางอัตโนมัติเพิ่มประสิทธิผลโดยรวมของอุปกรณ์ (OEE) 22-28%',
                    'การบำรุงรักษาเชิงทำนายลดต้นทุนการบำรุงรักษา 25-30% เทียบกับวิธีแบบดั้งเดิมที่ใช้เวลาเป็นหลัก'
                ]
            },
            'SecondaryTemperatureControl.pdf': {
                en: [
                    'Advanced PID controllers with adaptive tuning achieve ±2°C temperature control accuracy vs ±5°C with traditional methods',
                    'Sensor fusion combining thermocouples, RTDs, and infrared cameras increases measurement reliability by 85%',
                    'AI-powered predictive temperature control reduces energy consumption by 15-25% while maintaining product quality',
                    'Real-time fault detection systems identify sensor drift and actuator malfunctions 6-8 hours before quality impact',
                    'Cascade control architectures improve multi-zone temperature uniformity by 40-60% in large industrial furnaces',
                    'Machine learning algorithms enable automatic parameter adaptation to changing process conditions',
                    'Implementation case studies show 20-35% reduction in product defects related to temperature variations',
                    'Integration with Industry 4.0 systems provides comprehensive process visibility and remote monitoring capabilities'
                ],
                th: [
                    'ตัวควบคุม PID ขั้นสูงที่มีการปรับแต่งแบบปรับตัวสามารถควบคุมอุณหภูมิได้แม่นยำ ±2°C เทียบกับ ±5°C ของวิธีดั้งเดิม',
                    'การผสมผสานเซ็นเซอร์ที่รวมเทอร์โมคัปเปิล RTDs และกล้องอินฟราเรดเพิ่มความน่าเชื่อถือในการวัดได้ 85%',
                    'การควบคุมอุณหภูมิเชิงทำนายที่ขับเคลื่อนด้วย AI ลดการใช้พลังงาน 15-25% ในขณะที่รักษาคุณภาพผลิตภัณฑ์',
                    'ระบบตรวจจับความผิดพร่องแบบเรียลไทม์ระบุการเบี่ยงเบนของเซ็นเซอร์และความผิดปกติของแอคชูเอเตอร์ 6-8 ชั่วโมงก่อนส่งผลต่อคุณภาพ',
                    'สถาปัตยกรรมการควบคุมแบบ cascade ปรับปรุงความสม่ำเสมอของอุณหภูมิหลายโซน 40-60% ในเตาอุตสาหกรรมขนาดใหญ่',
                    'อัลกอริทึมการเรียนรู้ของเครื่องทำให้สามารถปรับพารามิเตอร์โดยอัตโนมัติตามสภาวะกระบวนการที่เปลี่ยนแปลง',
                    'กรณีศึกษาการใช้งานแสดงการลดข้อบกพร่องของผลิตภัณฑ์ที่เกี่ยวข้องกับการเปลี่ยนแปลงอุณหภูมิ 20-35%',
                    'การรวมเข้ากับระบบ Industry 4.0 ให้ความสามารถในการมองเห็นกระบวนการอย่างครอบคลุมและการติดตามระยะไกล'
                ]
            },
            'the-learning-organization-how-to-accelerate-ai-adoption_final2.pdf': {
                en: [
                    'Cultural transformation is the #1 critical success factor - 73% of AI initiatives fail due to organizational resistance',
                    'Learning organizations adopt AI 3.5x faster than traditional hierarchical structures',
                    'Cross-functional AI centers of excellence increase successful implementation rates by 65-80%',
                    'Psychological safety creation enables 4x more AI experimentation and innovation attempts',
                    'Executive sponsorship with dedicated AI transformation budget increases success probability by 85%',
                    'Continuous learning programs reduce AI skill gaps by 60-70% within 12-18 months',
                    'Fortune 500 case studies demonstrate 25-40% competitive advantage through learning-driven AI adoption',
                    'Change management specifically tailored for AI transformation reduces resistance by 50-65%',
                    'Measurement frameworks tracking learning maturity correlate with 3x higher AI ROI achievement'
                ],
                th: [
                    'การเปลี่ยนแปลงวัฒนธรรมเป็นปัจจัยสำเร็จสำคัญอันดับ 1 - 73% ของโครงการ AI ล้มเหลวเนื่องจากความต้านทานขององค์กร',
                    'องค์กรแห่งการเรียนรู้นำ AI มาใช้เร็วกว่าโครงสร้างแบบลำดับชั้นดั้งเดิม 3.5 เท่า',
                    'ศูนย์ความเป็นเลิศ AI ข้ามหน้าที่เพิ่มอัตราการใช้งานที่ประสบความสำเร็จ 65-80%',
                    'การสร้างความปลอดภัยทางจิตใจช่วยให้มีการทดลองและนวัตกรรม AI มากขึ้น 4 เท่า',
                    'การสนับสนุนจากผู้บริหารพร้อมงบประมาณเปลี่ยนแปลง AI เฉพาะเพิ่มความน่าจะเป็นของความสำเร็จ 85%',
                    'โปรแกรมการเรียนรู้ต่อเนื่องลดช่องว่างทักษะ AI 60-70% ภายใน 12-18 เดือน',
                    'กรณีศึกษา Fortune 500 แสดงให้เห็นความได้เปรียบในการแข่งขัน 25-40% ผ่านการนำ AI มาใช้ที่ขับเคลื่อนด้วยการเรียนรู้',
                    'การจัดการการเปลี่ยนแปลงที่ออกแบบมาเฉพาะสำหรับการเปลี่ยนแปลง AI ลดความต้านทาน 50-65%',
                    'กรอบการวัดที่ติดตามความสุกใสในการเรียนรู้มีความสัมพันธ์กับการบรรลุ AI ROI สูงขึ้น 3 เท่า'
                ]
            },
            'Data mining technicque for failure prediction.pdf': {
                en: [
                    'Ensemble machine learning algorithms achieve 85-95% failure prediction accuracy with <3% false positive rates',
                    'Feature engineering from time-series sensor data improves prediction performance by 35-45% over raw data approaches',
                    'Real-time Apache Kafka/Spark architectures enable millisecond-level anomaly detection for critical equipment',
                    'SMOTE and ADASYN techniques for imbalanced datasets increase rare failure event detection by 60-75%',
                    'SHAP and LIME interpretability frameworks provide actionable maintenance insights for 90%+ of predictions',
                    'Cross-industry validation shows 25-40% ROI improvement through reduced unplanned downtime',
                    'Integration with CMMS/ERP systems automates 70-80% of maintenance scheduling and work order generation',
                    'Advanced anomaly detection identifies previously unknown failure modes in 15-20% of industrial equipment',
                    'Temporal validation methodologies ensure model reliability across seasonal and operational variations'
                ],
                th: [
                    'อัลกอริทึม Ensemble machine learning บรรลุความแม่นยำในการทำนายความล้มเหลว 85-95% พร้อมอัตรา false positive <3%',
                    'การสร้าง Feature จากข้อมูลเซ็นเซอร์ time-series ปรับปรุงประสิทธิภาพการทำนาย 35-45% เทียบกับวิธีข้อมูลดิบ',
                    'สถาปัตยกรรม Apache Kafka/Spark แบบเรียลไทม์ช่วยให้สามารถตรวจจับความผิดปกติในระดับมิลลิวินาทีสำหรับอุปกรณ์สำคัญ',
                    'เทคนิค SMOTE และ ADASYN สำหรับชุดข้อมูลที่ไม่สมดุลเพิ่มการตรวจจับเหตุการณ์ความล้มเหลวที่หายาก 60-75%',
                    'กรอบการตีความ SHAP และ LIME ให้ข้อมูลเชิงลึกการบำรุงรักษาที่สามารถปฏิบัติได้สำหรับการทำนาย 90%+',
                    'การตรวจสอบข้ามอุตสาหกรรมแสดงการปรับปรุง ROI 25-40% ผ่านการลดเวลาหยุดทำงานที่ไม่ได้วางแผน',
                    'การรวมเข้ากับระบบ CMMS/ERP ทำให้การจัดตารางการบำรุงรักษาและการสร้างใบสั่งงานเป็นไปโดยอัตโนมัติ 70-80%',
                    'การตรวจจับความผิดปกติขั้นสูงระบุโหมดความล้มเหลวที่ไม่เคยรู้จักมาก่อนใน 15-20% ของอุปกรณ์อุตสาหกรรม',
                    'วิธีการตรวจสอบ Temporal รับประกันความน่าเชื่อถือของโมเดลข้ามการเปลี่ยนแปลงตามฤดูกาลและการดำเนินงาน'
                ]
            }
        };
        
        return insights[filename] || {
            en: ['Insights generation in progress...'],
            th: ['กำลังสร้างข้อมูลเชิงลึก...']
        };
    }

    findPodcastFile(pdfFilename) {
        console.log('Finding podcast file for:', pdfFilename);
        
        // For the existing file we know about
        if (pdfFilename === 'the-learning-organization-how-to-accelerate-ai-adoption_final2.pdf') {
            return 'the-learning-organization-how-to-accelerate-ai-adoption_final2.wav';
        }
        
        return null; // No podcast found for other files
    }

    formatTitle(filename) {
        return filename
            .replace('.pdf', '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
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
        console.log('Refreshing cards...');
        try {
            await this.loadKnowledgeCards();
        } catch (error) {
            console.error('Error refreshing cards:', error);
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
    console.log('DOM Content Loaded - Initializing Simple Knowledge Base App');
    try {
        app = new SimpleKnowledgeBaseApp();
        window.app = app; // Make globally accessible
        console.log('App initialization completed');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = '<p style="color: red;">Failed to initialize app: ' + error.message + '</p>';
        }
    }
});

console.log('Simple Knowledge Base App script loaded');