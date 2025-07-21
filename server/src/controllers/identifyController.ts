import { Request, Response } from 'express';
import { identifyContact, consolidateContact } from '../services/contactService';
import { IdentifyRequestBody } from '../types';

export const identify = async (req: Request, res: Response) => {
  const { email, phoneNumber }: IdentifyRequestBody = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'Either email or phoneNumber must be provided.' });
  }

  try {
    const contacts = await identifyContact({ email, phoneNumber });
    const consolidated = consolidateContact(contacts);
    return res.status(200).json({ contact: consolidated });
  } catch (error: any) {
    console.error('Error in identify:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};