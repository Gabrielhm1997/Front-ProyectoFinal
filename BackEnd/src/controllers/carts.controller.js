import cartModel from "../models/cart.models.js"
import productModel from "../models/products.models.js"
import ticketModel from "../models/ticket.models.js"

export class cartsController {

    postCart = async (req, res) => {// Crea un nuevo carrito Vacio
        try {
            const cart = await cartModel.create({})
            res.status(201).send(cart)

        } catch (error) {
            res.status(400).send(`Error creating a new cart: ${error}`)
        }
    }

    postProductInCart = async (req, res) => {// Agrega un producto por su id al carrito
        const { cid, pid } = req.params
        const { quantity } = req.body

        try {
            const cartFound = await cartModel.findById(cid)
            if (cartFound) {
                const productCollectionFound = await productModel.findById(pid)
                if (productCollectionFound) {
                    const productCartFound = cartFound.products.find(product => product.id_prod._id.toString() === pid)
                    if (productCartFound) {
                        res.status(400).send({ respuesta: 'OK', mensaje: 'The product already exists in the cart, please use the corresponding PUT method' })
                    } else {
                        cartFound.products.push({ id_prod: pid, quantity: quantity })
                        await cartFound.save()
                        res.status(200).send({ respuesta: 'OK', mensaje: cartFound.products })
                    }
                } else {
                    res.status(404).send(`Product Not Found`)
                }

            } else {
                res.status(404).send(`Cart Not Found`)
            }
        } catch (error) {
            res.status(400).send({ error: error })
        }
    }

    getProductsFromCart = async (req, res) => {// Lista los productos del carrito

        const { cid } = req.params

        try {
            const cart = await cartModel.findOne({ _id: cid })
            if (cart) {
                const products = cart.products
                if (products.length > 0) {
                    res.status(200).send(products)
                } else {
                    res.status(400).send("Cart empty")
                }
            } else {
                res.status(404).send(`Cart Not Found`)
            }
        } catch (error) {
            res.status(400).send(`Error checking carts: ${error}`)
        }
    }

    putArrayOnCart = async (req, res) => {// Agrega un array al carrito
        const { cid } = req.params
        const { arrayProducts } = req.body

        let i = 0
        let invalidProducts = []

        try {
            const cartFound = await cartModel.findById(cid)

            if (cartFound) {

                const recursiva = async () => {

                    if (i < arrayProducts.length) {

                        let productCartFound = cartFound.products.find(product => product.id_prod._id.toString() === arrayProducts[i].id_prod)

                        if (productCartFound) {

                            productCartFound.quantity = arrayProducts[i].quantity
                            await cartFound.save()
                            i += 1
                            recursiva()

                        } else {
                            try {
                                let productCollectionFound = null
                                productCollectionFound = await productModel.findById(arrayProducts[i].id_prod)

                                if (productCollectionFound) {
                                    cartFound.products.push(arrayProducts[i])
                                    await cartFound.save()
                                    i += 1
                                    recursiva()
                                } else {
                                    invalidProducts.push(arrayProducts[i])
                                    i += 1
                                    recursiva()
                                }
                            } catch (error) {
                                res.status(400).send(`Error: ${error}`)
                            }
                        }
                    } else {
                        res.status(200).send({ status: "OK", cart: cartFound, invalidProducts: invalidProducts })
                    }
                }
                recursiva()
            } else {
                res.status(404).send('Cart not found')
            }
        } catch (error) {
            res.status(400).send(`Error: ${error}`)
        }
    }

    putUpdateProductCuantity = async (req, res) => {// Actualiza solo quantity 
        const { cid, pid } = req.params
        const { quantity } = req.body

        try {

            const cartFound = await cartModel.findById(cid)

            if (cartFound) {

                const productCartFound = cartFound.products.find(product => product.id_prod._id.toString() === pid)

                if (productCartFound) {

                    productCartFound.quantity = quantity
                    await cartFound.save()
                    res.status(200).send({ respuesta: 'OK', mensaje: cartFound.products })

                } else {

                    res.status(404).send({ respuesta: 'Product does not exist in the cart', mensaje: cartFound.products })
                }

            } else {
                res.status(404).send(`Cart Not Found`)
            }

        } catch (e) {
            res.status(400).send({ error: e })
        }
    }

    deleteEmptyCart = async (req, res) => {//Vaciar el carrito

        const { cid } = req.params

        try {

            const cartFound = await cartModel.findById(cid)

            if (cartFound) {

                cartFound.products = []
                await cartFound.save()

                res.status(200).send(cartFound)

            } else {
                res.status(404).send(`Cart Not Found`)
            }

        } catch (error) {
            res.status(400).send(error)
        }
    }

    deleteProductFromCart = async (req, res) => {// Elimina un producto especifico del carrito
        const { cid, pid } = req.params

        try {

            const cartFound = await cartModel.findById(cid)

            if (cartFound) {

                const productCartFound = cartFound.products.find(product => product.id_prod._id.toString() === pid)

                if (productCartFound) {

                    const indice = cartFound.products.indexOf(productCartFound)
                    cartFound.products.splice(indice, 1)
                    await cartFound.save()
                    res.status(200).send({ respuesta: 'OK', mensaje: cartFound.products })

                } else {
                    res.status(404).send({ respuesta: 'Product does not exist in the cart', mensaje: cartFound.products })
                }

            } else {
                res.status(404).send(`Cart Not Found`)
            }

        } catch (e) {
            res.status(400).send({ error: e })
        }
    }

    postPurchase = async (req, res) => {// Finalizar compra
        const { cid } = req.params
        let i = 0

        try {

            const cart = await cartModel.findById(cid)

            if (cart) {

                if (cart.products.length > 0) {

                    const validProducts = []

                    const asyncFilter = async () => {

                        if (i < cart.products.length) {

                            if (cart.products[i].quantity <= ((await productModel.findById(cart.products[i].id_prod)).stock)) {
                                validProducts.push(cart.products[i])
                            }

                            i += 1
                            asyncFilter()
                        } else {

                            let total = 0

                            validProducts.forEach(product => {
                                total += (product.id_prod.price * product.quantity)
                            })
                            const ticket = await ticketModel.create({ purchaser: req.user.email, amount: total })

                            cart.products = []
                            await cart.save()

                            res.status(200).send({ ticket: ticket /*validProducts: validProducts, total: total */ })
                        }
                    }
                    asyncFilter()
                } else {
                    res.status(400).send({ error: "Empty Cart" })
                }
            } else {
                res.status(404).send({ error: "Not found" })
            }

        } catch (error) {
            res.status(400).send({ error: error })
        }
    }
}


// try {
//     cart.products.map(async (product) => {

//         if (product.quantity > ((await productModel.findById(product.id_prod)).stock)) {
//             console.log("mayor")
//         } else if (product.quantity <= ((await productModel.findById(product.id_prod)).stock)) {
//             console.log("menor-igual")
//             validProducts.push(product)
//         } else {
//             console.log(false)
//         }

//         //console.log((await productModel.findById(product.id_prod)).stock)
//     })
//     console.log(validProducts)
//     res.status(200).send({ validProducts: validProducts })
// } catch (error) {
//     console.log(error)
// }
//const validProducts = cart.products.filter(async (product) => product.quantity <= ((await productModel.findById(product.id_prod)).stock))