import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("Starting seed...")

  // Get module services
  const regionService = container.resolve(Modules.REGION)
  const storeService = container.resolve(Modules.STORE)
  const productService = container.resolve(Modules.PRODUCT)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const customerService = container.resolve(Modules.CUSTOMER)
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
  const inventoryService = container.resolve(Modules.INVENTORY)
  const pricingService = container.resolve(Modules.PRICING)
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)

  // 1. Create Store
  logger.info("Creating store...")
  let [store] = await storeService.listStores({})
  if (!store) {
    store = await storeService.createStores({
      name: "Medusa Dev Store",
      supported_currencies: [
        { currency_code: "usd", is_default: true },
        { currency_code: "eur" },
      ],
    })
  }
  logger.info(`Store: ${store.name}`)

  // 2. Create Sales Channel
  logger.info("Creating sales channel...")
  let [salesChannel] = await salesChannelService.listSalesChannels({})
  if (!salesChannel) {
    salesChannel = await salesChannelService.createSalesChannels({
      name: "Default Sales Channel",
      description: "Main storefront channel",
    })
  }
  logger.info(`Sales Channel: ${salesChannel.name}`)

  // 3. Create Region
  logger.info("Creating region...")
  let [region] = await regionService.listRegions({})
  if (!region) {
    region = await regionService.createRegions({
      name: "United States",
      currency_code: "usd",
      countries: ["us"],
    })
  }
  logger.info(`Region: ${region.name}`)

  // 4. Create Stock Location
  logger.info("Creating stock location...")
  let [stockLocation] = await stockLocationService.listStockLocations({})
  if (!stockLocation) {
    stockLocation = await stockLocationService.createStockLocations({
      name: "Main Warehouse",
      address: {
        address_1: "123 Main St",
        city: "Los Angeles",
        country_code: "us",
        postal_code: "90001",
      },
    })
  }
  logger.info(`Stock Location: ${stockLocation.name}`)

  // 5. Create Product Categories
  logger.info("Creating product categories...")
  const categories = await productService.createProductCategories([
    { name: "Clothing", handle: "clothing" },
    { name: "Accessories", handle: "accessories" },
    { name: "Electronics", handle: "electronics" },
  ])
  logger.info(`Created ${categories.length} categories`)

  // 6. Create Products
  logger.info("Creating products...")
  const products = await productService.createProducts([
    {
      title: "Medusa T-Shirt",
      handle: "medusa-t-shirt",
      description: "A comfortable cotton t-shirt with the Medusa logo",
      status: "published",
      options: [
        { title: "Size", values: ["S", "M", "L", "XL"] },
        { title: "Color", values: ["Black", "White", "Navy"] },
      ],
      variants: [
        { title: "Small / Black", sku: "TSHIRT-S-BLK", options: { Size: "S", Color: "Black" }, manage_inventory: true },
        { title: "Medium / Black", sku: "TSHIRT-M-BLK", options: { Size: "M", Color: "Black" }, manage_inventory: true },
        { title: "Large / Black", sku: "TSHIRT-L-BLK", options: { Size: "L", Color: "Black" }, manage_inventory: true },
        { title: "Small / White", sku: "TSHIRT-S-WHT", options: { Size: "S", Color: "White" }, manage_inventory: true },
        { title: "Medium / White", sku: "TSHIRT-M-WHT", options: { Size: "M", Color: "White" }, manage_inventory: true },
        { title: "Large / White", sku: "TSHIRT-L-WHT", options: { Size: "L", Color: "White" }, manage_inventory: true },
      ],
    },
    {
      title: "Medusa Hoodie",
      handle: "medusa-hoodie",
      description: "A warm and cozy hoodie perfect for coding sessions",
      status: "published",
      options: [
        { title: "Size", values: ["S", "M", "L", "XL"] },
      ],
      variants: [
        { title: "Small", sku: "HOODIE-S", options: { Size: "S" }, manage_inventory: true },
        { title: "Medium", sku: "HOODIE-M", options: { Size: "M" }, manage_inventory: true },
        { title: "Large", sku: "HOODIE-L", options: { Size: "L" }, manage_inventory: true },
        { title: "XL", sku: "HOODIE-XL", options: { Size: "XL" }, manage_inventory: true },
      ],
    },
    {
      title: "Medusa Cap",
      handle: "medusa-cap",
      description: "Stylish cap with embroidered Medusa logo",
      status: "published",
      options: [
        { title: "Color", values: ["Black", "Navy", "Gray"] },
      ],
      variants: [
        { title: "Black", sku: "CAP-BLK", options: { Color: "Black" }, manage_inventory: true },
        { title: "Navy", sku: "CAP-NAV", options: { Color: "Navy" }, manage_inventory: true },
        { title: "Gray", sku: "CAP-GRY", options: { Color: "Gray" }, manage_inventory: true },
      ],
    },
    {
      title: "Medusa Mug",
      handle: "medusa-mug",
      description: "Ceramic mug for your morning coffee",
      status: "published",
      variants: [
        { title: "Default", sku: "MUG-001", manage_inventory: true },
      ],
    },
    {
      title: "Medusa Sticker Pack",
      handle: "medusa-stickers",
      description: "Pack of 10 vinyl stickers",
      status: "published",
      variants: [
        { title: "Default", sku: "STICKER-PACK", manage_inventory: true },
      ],
    },
  ])
  logger.info(`Created ${products.length} products`)

  // 7. Create Prices for Products
  logger.info("Creating prices...")
  const priceList = await pricingService.createPriceLists([
    {
      title: "Default Prices",
      description: "Default pricing",
      type: "sale",
      status: "active",
    },
  ])

  // Get all variants
  const allVariants = products.flatMap((p) => p.variants)

  // Create prices for each variant
  const prices = allVariants.map((variant, index) => {
    const basePrice = [1999, 4999, 2499, 1499, 999][Math.floor(index / 3) % 5] // Different prices per product
    return {
      variant_id: variant.id,
      amount: basePrice,
      currency_code: "usd",
      rules: {},
    }
  })

  // Use pricing service to set prices
  for (const product of products) {
    for (const variant of product.variants) {
      const basePrice = product.title.includes("T-Shirt") ? 1999
        : product.title.includes("Hoodie") ? 4999
        : product.title.includes("Cap") ? 2499
        : product.title.includes("Mug") ? 1499
        : 999

      await pricingService.createPriceSets([
        {
          prices: [
            { amount: basePrice, currency_code: "usd" },
            { amount: Math.round(basePrice * 0.9), currency_code: "eur" },
          ],
        },
      ])
    }
  }
  logger.info("Created prices for all variants")

  // 8. Create Inventory Items and Stock
  logger.info("Creating inventory...")
  for (const product of products) {
    for (const variant of product.variants) {
      const inventoryItem = await inventoryService.createInventoryItems({
        sku: variant.sku,
        title: variant.title,
      })

      await inventoryService.createInventoryLevels({
        inventory_item_id: inventoryItem.id,
        location_id: stockLocation.id,
        stocked_quantity: Math.floor(Math.random() * 100) + 10,
      })
    }
  }
  logger.info("Created inventory for all variants")

  // 9. Create Customers
  logger.info("Creating customers...")
  const customers = await customerService.createCustomers([
    {
      email: "john.doe@example.com",
      first_name: "John",
      last_name: "Doe",
    },
    {
      email: "jane.smith@example.com",
      first_name: "Jane",
      last_name: "Smith",
    },
    {
      email: "bob.wilson@example.com",
      first_name: "Bob",
      last_name: "Wilson",
    },
  ])
  logger.info(`Created ${customers.length} customers`)

  // 10. Create Fulfillment Provider
  logger.info("Setting up fulfillment...")
  const fulfillmentSets = await fulfillmentService.createFulfillmentSets([
    {
      name: "Standard Shipping",
      type: "shipping",
    },
  ])
  logger.info("Created fulfillment set")

  logger.info("=".repeat(50))
  logger.info("Seed completed successfully!")
  logger.info("=".repeat(50))
  logger.info(`Store: ${store.name}`)
  logger.info(`Region: ${region.name}`)
  logger.info(`Sales Channel: ${salesChannel.name}`)
  logger.info(`Products: ${products.length}`)
  logger.info(`Customers: ${customers.length}`)
  logger.info("=".repeat(50))
}
