  Core Features                                                   
                                                                  
  Modular Architecture                                            
  - 30+ commerce modules (product, order, cart, payment,          
  inventory, pricing, etc.)                                       
  - 15+ provider implementations for payments, fulfillment,       
  notifications                                                   
  - Each module is independent and composable                     
                                                                  
  Commerce Capabilities                                           
  - Product catalog management                                    
  - Order management & fulfillment                                
  - Cart & checkout flows                                         
  - Payment processing                                            
  - Inventory tracking                                            
  - Promotions & discounts                                        
  - Customer management                                           
  - Multi-region/currency support                                 
                                                                  
  Technical Features                                              
  - Workflows SDK - Composable, transactional business logic with 
  compensation (rollback)                                         
  - API Routes - RESTful API with typed requests/responses        
  - Admin Dashboard - React-based admin UI                        
  - Event System - Domain events for extensibility                
  - Query Graph - Flexible data querying across modules           
                                                                  
  Developer Experience                                            
  - TypeScript-first with strict typing                           
  - Dependency injection via decorators                           
  - CLI tools for scaffolding                                     
  - Integration test infrastructure                               
                                                                  
  Extensibility                                                   
  - Custom modules and providers                                  
  - Workflow hooks for customization                              
  - Plugin architecture                                           
                                                                  
  The platform targets developers building custom e-commerce      
  solutions who need flexibility beyond traditional monolithic    
  platforms like Shopify or WooCommerce.                          
                                        


 Medusa Packages Structure                          
                                                     
  packages/                                          
  ├── medusa/                  # Main Medusa         
  application package                                
  ├── medusa-telemetry/        # Telemetry collection
  ├── medusa-test-utils/       # Testing utilities   
  │                                                  
  ├── core/                    # Core Framework      
  │   ├── framework/           # Core runtime, HTTP, 
  database                                           
  │   ├── types/               # TypeScript          
  definitions                                        
  │   ├── utils/               # Shared utilities    
  │   ├── workflows-sdk/       # Workflow composition
   SDK                                               
  │   ├── core-flows/          # Predefined business 
  workflows                                          
  │   ├── modules-sdk/         # Module development  
  SDK                                                
  │   ├── orchestration/       # Workflow            
  orchestration                                      
  │   └── js-sdk/              # JavaScript client   
  SDK                                                
  │                                                  
  ├── modules/                 # Commerce Modules    
  (35)                                               
  │   ├── product/             # Product catalog     
  │   ├── order/               # Order management    
  │   ├── cart/                # Shopping cart       
  │   ├── payment/             # Payment processing  
  │   ├── fulfillment/         # Fulfillment/shipping
  │   ├── inventory/           # Inventory tracking  
  │   ├── pricing/             # Price management    
  │   ├── promotion/           # Discounts &         
  promotions                                         
  │   ├── customer/            # Customer management 
  │   ├── user/                # Admin users         
  │   ├── auth/                # Authentication      
  │   ├── api-key/             # API key management  
  │   ├── region/              # Multi-region support
  │   ├── currency/            # Currency handling   
  │   ├── tax/                 # Tax calculation     
  │   ├── notification/        # Notifications       
  │   ├── file/                # File storage        
  │   ├── store/               # Store settings      
  │   ├── sales-channel/       # Sales channels      
  │   ├── stock-location/      # Stock locations     
  │   ├── analytics/           # Analytics           
  │   ├── caching/             # Cache abstraction   
  │   ├── locking/             # Distributed locking 
  │   ├── rbac/                # Role-based access   
  control                                            
  │   ├── settings/            # Settings management 
  │   ├── translation/         # i18n translations   
  │   ├── index/               # Search indexing     
  │   ├── link-modules/        # Module linking      
  │   ├── cache-inmemory/      # In-memory cache     
  │   ├── cache-redis/         # Redis cache         
  │   ├── event-bus-local/     # Local event bus     
  │   ├── event-bus-redis/     # Redis event bus     
  │   ├── workflow-engine-*/   # Workflow engines    
  │   │                                              
  │   └── providers/           # Provider            
  Implementations (16)                               
  │       ├── auth-emailpass/  # Email/password auth 
  │       ├── auth-google/     # Google OAuth        
  │       ├── auth-github/     # GitHub OAuth        
  │       ├── payment-stripe/  # Stripe payments     
  │       ├── file-local/      # Local file storage  
  │       ├── file-s3/         # AWS S3 storage      
  │       ├── notification-sendgrid/  # SendGrid     
  emails                                             
  │       ├── notification-local/     # Local        
  notifications                                      
  │       ├── fulfillment-manual/     # Manual       
  fulfillment                                        
  │       ├── locking-postgres/       # Postgres     
  locking                                            
  │       ├── locking-redis/          # Redis locking
  │       ├── caching-redis/          # Redis caching
  │       ├── analytics-local/        # Local        
  analytics                                          
  │       ├── analytics-posthog/      # PostHog      
  analytics                                          
  │       └── supabase/               # Supabase     
  integration                                        
  │                                                  
  ├── admin/                   # Admin Dashboard     
  │   ├── dashboard/           # React admin UI      
  │   ├── admin-sdk/           # Admin SDK           
  │   ├── admin-shared/        # Shared components   
  │   ├── admin-bundler/       # Build tooling       
  │   └── admin-vite-plugin/   # Vite plugin         
  │                                                  
  ├── cli/                     # CLI Tools           
  ├── design-system/           # UI Component Library
  ├── deps/                    # Shared dependencies 
  └── plugins/                 # Plugin system 


<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>
<h1 align="center">
  Medusa
</h1>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

<p align="center">
  Building blocks for digital commerce
</p>
<p align="center">
  <a href="https://github.com/medusajs/medusa/blob/develop/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Medusa is released under the MIT license." />
  </a>
  <a href="https://github.com/medusajs/medusa/blob/develop/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
 <p align="center">
  <a href="https://twitter.com/intent/follow?screen_name=medusajs">
    <img src="https://img.shields.io/twitter/follow/medusajs.svg?label=Follow%20@medusajs" alt="Follow @medusajs" />
  <a href="https://discord.gg/medusajs">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
</p>

## Getting Started

Visit the [Documentation](https://docs.medusajs.com/learn) to set up a Medusa application.

## About Medusa

Medusa is a commerce platform with a built-in framework for customization that allows you to build custom commerce applications without reinventing core commerce logic. The framework and modules can be used to support advanced B2B or DTC commerce stores, marketplaces, distributor platforms, PoS systems, service businesses, or similar solutions that need foundational commerce primitives. All commerce modules are open-source and freely available on npm.

Learn more about [Medusa’s architecture](https://docs.medusajs.com/learn/advanced-development/architecture/overview) and [commerce modules](https://docs.medusajs.com/resources/commerce-modules) in the Docs.

## Upgrades & Integrations

Follow the [Release Notes](https://github.com/medusajs/medusa/releases) to keep your Medusa project up-to-date.

Check out all [available Medusa integrations](https://medusajs.com/integrations/).

## Community & Contributions

The core team is available in [GitHub Discussions](https://github.com/medusajs/medusa/discussions), where you can create issues, share ideas, and discuss roadmap.

Our [Contribution Guide](https://github.com/medusajs/medusa/blob/develop/CONTRIBUTING.md) describes how to contribute to the codebase and Docs.

Join our [Discord server](https://discord.gg/medusajs) to meet and discuss with more than 14,000 other community members.

## Other channels

- [GitHub Issues](https://github.com/medusajs/medusa/issues)
- [Community Discord](https://discord.gg/medusajs)
- [Twitter](https://twitter.com/medusajs)
- [LinkedIn](https://www.linkedin.com/company/medusajs)
- [Medusa Blog](https://medusajs.com/blog/)

## License

Licensed under the [MIT License](https://github.com/medusajs/medusa/blob/develop/LICENSE).
