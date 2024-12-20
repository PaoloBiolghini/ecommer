import { NextApiRequest, NextApiResponse } from 'next';


import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import { stripe } from '../../../lib/stripe';
import { buffer } from 'micro';

//we want the raw body to be available for the stripe webhook signature verification
export const config={
    api:{
        bodyParser:false
    }
};

export default async function webhookHandler(req: NextApiRequest, res: NextApiResponse) {

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
        return res.status(400).send(`Webhook error: missing stripe secret key`);
    }

    if (req.method === "POST") {
        
        const buf = await buffer(req);
        const sig = req.headers['stripe-signature'];
        const webhookSecret= process.env.STRIPE_WEBHOOK_SIGNING_SECRET;

        let event:Stripe.Event;

        try{
            if(!sig || !webhookSecret) return res.status(400).send(`Webhook error: missing signature or secret`);

            event=stripe.webhooks.constructEvent(buf,sig,webhookSecret);

        }catch(error: any){
            console.log("WEBHOOK ERROR",error.message);
            return res.status(400).send(`Webhook error: ${error.message}`);
        }

        const session= event.data.object as Stripe.Checkout.Session;

        if(event.type==="checkout.session.completed"){
            console.log('SUCECSFULL PAYMENT');

            try {
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
                    expand: ['data.price.product'],
                });

                console.log('Purchased items:', lineItems.data);
            } catch (error) {
                console.error('Error fetching line items:', error);
            }

            // console.log('session',session);
            // console.log("event",event);
        }

        
        console.log('event',event.type);

        res.status(200).send("Success");

    }else{
        res.status(405).json({ message: "Method not allowed" });
    }
}