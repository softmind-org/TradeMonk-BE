import axios from 'axios';

const testSendcloud = async () => {
    try {
        const pk = 'd85dda31-d732-4b34-9289-def067d6b1ed';
        const sk = 'ae1308a5bf264f64be771501408fb623';
        const token = Buffer.from(`${pk}:${sk}`).toString('base64');
        
        const res = await axios.get('https://panel.sendcloud.sc/api/v2/shipping_methods', {
            headers: {
                'Authorization': `Basic ${token}`
            }
        });
        
        console.log(JSON.stringify(res.data.shipping_methods.slice(0, 2), null, 2));
    } catch (e) {
        console.error(e.message);
        if (e.response) console.error(JSON.stringify(e.response.data, null, 2));
    }
};

testSendcloud();
