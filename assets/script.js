/**
 * Main Application Entry Point
 * Initializes services and controllers
 */

// Application configuration
const AppConfig = {
    autoSave: true,
    autoSaveInterval: 30000, // 30 seconds
    debug: true,
    features: {
        notifications: true,
        keyboardShortcuts: true,
        autoComplete: false
    }
};

// Global application instance
let app = null;

/**
 * Application class - manages the entire application lifecycle
 */
class AppointMeApp {
    constructor(config = {}) {
        this.config = { ...AppConfig, ...config };
        this.services = {};
        this.controllers = {};
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.log('Initializing AppointMe Application...');
            
            // Initialize services (business logic)
            await this.initializeServices();
            
            // Initialize controllers (UI logic)
            await this.initializeControllers();
            
            // Setup application-wide features
            this.setupGlobalFeatures();
            
            // Mark as initialized
            this.isInitialized = true;
            
            this.log('Application initialized successfully!');
            
            // Trigger custom event for other scripts
            window.dispatchEvent(new CustomEvent('appointMeReady', { 
                detail: { app: this } 
            }));
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showErrorScreen(error);
        }
    }

    /**
     * Initialize all services
     */
    async initializeServices() {
        this.log('Initializing services...');
        
        // User service
        this.services.userService = new UserService();
        
        // Enable auto-save if configured
        if (this.config.autoSave) {
            this.services.userService.enableAutoSave(this.config.autoSaveInterval);
        }
        
        // Future services can be added here:
        // this.services.appointmentService = new AppointmentService();
        // this.services.availabilityService = new AvailabilityService();
        // this.services.notificationService = new NotificationService();
        // this.services.chatbotService = new ChatbotService();
    }

    /**
     * Initialize all controllers
     */
    async initializeControllers() {
        this.log('Initializing controllers...');
        
        // User UI controller
        this.controllers.userUIController = new UserUIController(this.services.userService);
        
        // Make controller globally accessible for onclick handlers
        window.userUIController = this.controllers.userUIController;
        
        // Future controllers can be added here:
        // this.controllers.appointmentUIController = new AppointmentUIController();
        // this.controllers.calendarController = new CalendarController();
        // this.controllers.chatbotController = new ChatbotController();
    }

    /**
     * Setup global application features
     */
    setupGlobalFeatures() {
        this.log('Setting up global features...');
        
        // Global error handling
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError(event.reason);
        });
        
        // Performance monitoring
        this.setupPerformanceMonitoring();
        
        // Development tools
        if (this.config.debug) {
            this.setupDebugTools();
        }
        
        // Custom shortcuts
        if (this.config.features.keyboardShortcuts) {
            this.setupGlobalShortcuts();
        }
    }

    /**
     * Global keyboard shortcuts
     */
    setupGlobalShortcuts() {
        document.addEventListener