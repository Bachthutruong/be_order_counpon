import axios from 'axios';

const getClient = () => {
  const url = process.env.WC_STORE_URL || 'https://trayson.tw';
  const consumerKey = process.env.WC_CONSUMER_KEY || '';
  const consumerSecret = process.env.WC_CONSUMER_SECRET || '';

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  return axios.create({
    baseURL: `${url}/wp-json/wc/v3`,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': url
    }
  });
};

export const createCoupon = async (code: string, amount: string, discount_type: string) => {
  const client = getClient();
  const response = await client.post('/coupons', {
    code,
    discount_type,
    amount
  });
  return response.data;
};

export const updateCoupon = async (id: number, data: any) => {
  const client = getClient();
  const response = await client.put(`/coupons/${id}`, data);
  return response.data;
};

export const deleteCoupon = async (id: number) => {
  const client = getClient();
  const response = await client.delete(`/coupons/${id}?force=true`);
  return response.data;
};

// We can implement sync function to pull orders too
export const getOrders = async (page: number = 1) => {
  const client = getClient();
  const response = await client.get(`/orders?per_page=50&page=${page}`);
  return response.data;
}
