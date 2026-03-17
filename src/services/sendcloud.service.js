import axios from 'axios';
import { sendcloudConfig } from '../config/sendcloud.config.js';

const getAuthToken = () => {
    return Buffer.from(`${sendcloudConfig.publicKey}:${sendcloudConfig.secretKey}`).toString('base64');
};

const sendcloudApi = axios.create({
    baseURL: sendcloudConfig.apiUrl,
    headers: {
        'Authorization': `Basic ${getAuthToken()}`,
        'Content-Type': 'application/json'
    }
});

const sendcloudService = {
    /**
     * Get available shipping methods from SendCloud
     * @param {string} fromCountry - ISO-2 code (e.g., 'DE', 'NL')
     * @param {string} toCountry - ISO-2 code (e.g., 'GB', 'US')
     * @param {number} weight - Weight in grams (default 500)
     */
    getShippingMethods: async (fromCountry, toCountry, weight = 500) => {
        try {
            const params = {
                is_return: false
            };
            if (fromCountry) params.from_country = fromCountry.toUpperCase();
            if (toCountry) params.to_country = toCountry.toUpperCase();
            if (weight) params.weight = weight;

            const response = await sendcloudApi.get('/shipping_methods', { params });
            const methods = response.data.shipping_methods || [];

            // Format response to extract the correct price and filter out service point deliveries
            return methods
                .filter(method => method.service_point_input !== 'required')
                .map(method => {
                    let actualPrice = typeof method.price === 'number' ? method.price : parseFloat(method.price);

                    if (method.countries && method.countries.length > 0) {
                        const countryRule = toCountry
                            ? method.countries.find(c => c.iso_2 === toCountry.toUpperCase())
                            : method.countries[0];

                        if (countryRule && countryRule.price != null) {
                            actualPrice = typeof countryRule.price === 'number' ? countryRule.price : parseFloat(countryRule.price);
                        }
                    }

                    return {
                        id: method.id,
                        name: method.name,
                        carrier: method.carrier,
                        min_weight: method.min_weight,
                        max_weight: method.max_weight,
                        price: isNaN(actualPrice) ? null : actualPrice
                    };
                }).filter(m => m.price != null); // Only return methods that have a valid price

        } catch (error) {
            console.error('SendCloud getShippingMethods error:', error.response?.data || error.message);
            throw new Error('Failed to fetch shipping methods from SendCloud');
        }
    },

    /**
     * Create a parcel and generate shipping label for an order
     * @param {Object} order - Mongoose Order document
     * @param {Object} seller - Mongoose User document representing the seller
     */
    createParcelAndLabel: async (order, seller) => {
        try {
            // Address details from order document
            const { shippingAddress, shippingMethodId, orderNumber } = order;

            if (!shippingMethodId) {
                throw new Error('No shipping method associated with this order');
            }

            // Using the base64 auth directly in the headers to prevent Axios interceptor issues
            const authToken = Buffer.from(`${sendcloudConfig.publicKey}:${sendcloudConfig.secretKey}`).toString('base64');

            // SendCloud often requires 'house_number' separately.
            let street = shippingAddress.address;
            let houseNumber = '1';

            const match = shippingAddress.address.match(/(.*?)\s+(\d+[a-zA-Z]?\s*)$/);
            if (match) {
                street = match[1].trim();
                houseNumber = match[2].trim();
            }

            // Determine seller's origin country for customs data
            const sellerCountry = (seller?.warehouseAddress?.country || 'NL').toUpperCase();

            // Map Mongoose order.items into SendCloud parcel_items (required for non-EU / Customs)
            const mappedParcelItems = (order.items || []).map(item => ({
                description: (item.title || 'Product').substring(0, 50),
                quantity: item.quantity || 1,
                weight: "0.500",
                value: String(item.price || '10.00'),
                hs_code: '9504',           // Generic HS code for games/cards/collectibles
                origin_country: sellerCountry // Required: country where the item was produced/shipped from
            }));

            // Fallback parcel item if order has no items
            const fallbackParcelItems = [{ description: 'TradeMonk Order', quantity: 1, weight: '0.500', value: '10.00', hs_code: '9504', origin_country: sellerCountry }];

            // SendCloud V2 Carrier Enforcement: Sender name MUST be <= 35 characters.
            // Dashboard Default: "Andries Adrianus Johannes Reinier Verhagen" (42 chars) -> REJECTED.
            // We fetch the account sender details and override them manually using 'from_' fields
            // to strictly truncate the name in the API request.
            let senderData = null;
            try {
                const senderRes = await axios.get(`${sendcloudConfig.apiUrl}/user/addresses/sender`, {
                    headers: { 'Authorization': `Basic ${authToken}`, 'Content-Type': 'application/json' }
                });
                const senderAddresses = senderRes.data?.sender_addresses || [];
                if (senderAddresses.length > 0) {
                    senderData = senderAddresses[0];
                }
            } catch (senderErr) {
                console.warn('Could not fetch SendCloud sender addresses:', senderErr.message);
            }

            const parcelPayload = {
                parcel: {
                    name: (shippingAddress.fullName || '').substring(0, 35),
                    address: street.substring(0, 35),
                    house_number: houseNumber.substring(0, 20),
                    city: (shippingAddress.city || '').substring(0, 30),
                    postal_code: shippingAddress.zipCode.replace(/\s+/g, '').substring(0, 15),
                    country: shippingAddress.country || 'NL',
                    weight: "0.500",
                    shipment: {
                        id: parseInt(shippingMethodId)
                    },
                    order_number: orderNumber,
                    request_label: true,
                    customs_invoice_nr: orderNumber,
                    customs_shipment_type: 2, // 2 = Commercial goods
                    parcel_items: mappedParcelItems.length > 0 ? mappedParcelItems : fallbackParcelItems
                }
            };

            // If we have sender data, we manually map 'from_' fields to bypass dashboard name limits.
            // Note: SendCloud requires 'from_address_1' for the street.
            if (senderData) {
                parcelPayload.parcel.from_name = (senderData.contact_name || senderData.company_name || 'TradeMonk').substring(0, 35);
                parcelPayload.parcel.from_company_name = (senderData.company_name || 'TradeMonk').substring(0, 35);
                parcelPayload.parcel.from_address_1 = senderData.street;
                parcelPayload.parcel.from_house_number = senderData.house_number;
                parcelPayload.parcel.from_postal_code = senderData.postal_code;
                parcelPayload.parcel.from_city = senderData.city;
                parcelPayload.parcel.from_country = senderData.country;
                parcelPayload.parcel.from_telephone = (senderData.telephone || '').substring(0, 20);
                parcelPayload.parcel.from_email = senderData.email;
            } else {
                console.warn("No sender data fetched. Sending without manual 'from_' overrides.");
            }

            const response = await axios.post(`${sendcloudConfig.apiUrl}/parcels`, parcelPayload, {
                headers: {
                    'Authorization': `Basic ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('SendCloud createParcel error:', error.response?.data?.error?.message || error.response?.data || error.message);
            throw new Error(`SendCloud Label Error: ${error.response?.data?.error?.message || 'Failed to create parcel and generate label'}`);
        }
    },

    /**
     * Get tracking information for a parcel
     * @param {string} trackingNumber - Sendcloud tracking number
     */
    getTracking: async (trackingNumber) => {
        try {
            const response = await sendcloudApi.get(`/tracking/${trackingNumber}`);
            return response.data;
        } catch (error) {
            console.error('SendCloud getTracking error:', error.response?.data || error.message);
            throw new Error('Failed to fetch tracking info from SendCloud');
        }
    }
};

export default sendcloudService;
