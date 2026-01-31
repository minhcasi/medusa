import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function seedSampleProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const regionService = container.resolve(Modules.REGION)
  const pricingService = container.resolve(Modules.PRICING)
  const linkService = container.resolve(ContainerRegistrationKeys.LINK)

  logger.info("Starting sample product seed...")

  // Create default sales channel
  let salesChannel
  const existingChannels = await salesChannelService.listSalesChannels({ name: "Default Sales Channel" })
  if (existingChannels.length > 0) {
    salesChannel = existingChannels[0]
    logger.info("Using existing sales channel")
  } else {
    const channels = await salesChannelService.createSalesChannels([
      { name: "Default Sales Channel", description: "Default channel" }
    ])
    salesChannel = channels[0]
    logger.info("Created default sales channel")
  }

  // Create default region
  let region
  const existingRegions = await regionService.listRegions({ name: "NA" })
  if (existingRegions.length > 0) {
    region = existingRegions[0]
    logger.info("Using existing region")
  } else {
    const regions = await regionService.createRegions([
      { name: "NA", currency_code: "usd", countries: ["us", "ca"] }
    ])
    region = regions[0]
    logger.info("Created NA region")
  }

  // Sample products data
  const productsData = [
    {
      title: "Medusa T-Shirt",
      description: "A comfortable cotton t-shirt with the Medusa logo",
      handle: "medusa-t-shirt",
      status: "published" as const,
      options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
      variants: [
        { title: "Small", sku: "SHIRT-S", options: { Size: "S" }, manage_inventory: false },
        { title: "Medium", sku: "SHIRT-M", options: { Size: "M" }, manage_inventory: false },
        { title: "Large", sku: "SHIRT-L", options: { Size: "L" }, manage_inventory: false },
        { title: "X-Large", sku: "SHIRT-XL", options: { Size: "XL" }, manage_inventory: false },
      ],
    },
    {
      title: "Medusa Hoodie",
      description: "A warm hoodie with the Medusa logo",
      handle: "medusa-hoodie",
      status: "published" as const,
      options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
      variants: [
        { title: "Small", sku: "HOODIE-S", options: { Size: "S" }, manage_inventory: false },
        { title: "Medium", sku: "HOODIE-M", options: { Size: "M" }, manage_inventory: false },
        { title: "Large", sku: "HOODIE-L", options: { Size: "L" }, manage_inventory: false },
        { title: "X-Large", sku: "HOODIE-XL", options: { Size: "XL" }, manage_inventory: false },
      ],
    },
    {
      title: "Medusa Mug",
      description: "A ceramic mug with the Medusa logo",
      handle: "medusa-mug",
      status: "published" as const,
      variants: [
        { title: "Default", sku: "MUG-001", manage_inventory: false },
      ],
    },
  ]

  // Create products
  for (const productData of productsData) {
    const existing = await productService.listProducts({ handle: productData.handle })
    if (existing.length > 0) {
      logger.info(`Product ${productData.title} already exists, skipping`)
      continue
    }

    const [product] = await productService.createProducts([productData])
    logger.info(`Created product: ${product.title}`)

    // Link product to sales channel
    await linkService.create({
      [Modules.PRODUCT]: { product_id: product.id },
      [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannel.id },
    })

    // Create prices for variants
    const priceSetIds: string[] = []
    for (const variant of product.variants) {
      const basePrice = productData.title.includes("Hoodie") ? 5999 :
                       productData.title.includes("T-Shirt") ? 2499 : 1499

      const priceSet = await pricingService.createPriceSets([{
        prices: [{ amount: basePrice, currency_code: "usd" }]
      }])

      priceSetIds.push(priceSet[0].id)

      await linkService.create({
        [Modules.PRODUCT]: { variant_id: variant.id },
        [Modules.PRICING]: { price_set_id: priceSet[0].id },
      })
    }
  }

  logger.info("Sample products seeded successfully!")
}
