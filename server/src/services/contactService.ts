import { prismaClient } from '../db';
import { Contact, IdentifyRequestBody, ConsolidatedContactResponse } from '../types';

export const identifyContact = async (
  payload: IdentifyRequestBody
): Promise<Contact[]> => {
  const { email, phoneNumber } = payload;

  if (!email && !phoneNumber) {
    throw new Error('Either email or phoneNumber must be provided.');
  }

  // Single query to get all related contacts
  const relatedContacts = await findAllRelatedContacts(email, phoneNumber);
  
  if (relatedContacts.length === 0) {
    // No existing contacts - create new primary
    const newContact = await prismaClient.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'primary',
      },
    });
    return [newContact];
  }

  // Process existing contacts and handle linking
  const processedContacts = await processContactLinking(relatedContacts, email, phoneNumber);
  return processedContacts;
};

async function findAllRelatedContacts(email?: string, phoneNumber?: string): Promise<Contact[]> {
  // Find all contacts that match email or phone
  const directMatches = await prismaClient.contact.findMany({
    where: {
      OR: [
        email ? { email } : {},
        phoneNumber ? { phoneNumber } : {},
      ].filter(condition => Object.keys(condition).length > 0),
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' }
  });

  if (directMatches.length === 0) {
    return [];
  }

  // Get all primary IDs from direct matches
  const primaryIds = new Set<number>();
  directMatches.forEach(contact => {
    if (contact.linkPrecedence === 'primary') {
      primaryIds.add(contact.id);
    } else if (contact.linkedId) {
      primaryIds.add(contact.linkedId);
    }
  });

  if (primaryIds.size === 0) {
    return directMatches;
  }

  // Get all contacts linked to these primaries
  const allLinkedContacts = await prismaClient.contact.findMany({
    where: {
      OR: [
        { id: { in: Array.from(primaryIds) } },
        { linkedId: { in: Array.from(primaryIds) } },
      ],
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });

  return allLinkedContacts;
}

async function processContactLinking(
  contacts: Contact[], 
  email?: string, 
  phoneNumber?: string
): Promise<Contact[]> {
  // Find the true primary (oldest primary contact)
  const primaries = contacts.filter(c => c.linkPrecedence === 'primary');
  const truePrimary = primaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  if (!truePrimary) {
    throw new Error('No primary contact found in related contacts');
  }

  // If multiple primaries exist, demote the newer ones to secondary
  if (primaries.length > 1) {
    const primariesToDemote = primaries.filter(p => p.id !== truePrimary.id);
    
    // Use a transaction to ensure consistency
    await prismaClient.$transaction(async (tx) => {
      // First, update all contacts that were linked to the primaries being demoted
      // to point to the true primary
      for (const primaryToDemote of primariesToDemote) {
        await tx.contact.updateMany({
          where: { 
            linkedId: primaryToDemote.id,
            deletedAt: null 
          },
          data: {
            linkedId: truePrimary.id,
            // updatedAt: new Date(),
          },
        });
      }
      
      // Then demote the primaries to secondary
      await Promise.all(
        primariesToDemote.map(contact =>
          tx.contact.update({
            where: { id: contact.id },
            data: {
              linkPrecedence: 'secondary',
              linkedId: truePrimary.id,
            //   updatedAt: new Date(),
            },
          })
        )
      );
    });
  }

  // Check if we need to create a new secondary contact
  const needsNewSecondary = shouldCreateNewSecondary(contacts, email, phoneNumber);
  
  if (needsNewSecondary) {
    await prismaClient.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId: truePrimary.id,
        linkPrecedence: 'secondary',
      },
    });
  }

  // Return final consolidated list
  return await prismaClient.contact.findMany({
    where: {
      OR: [
        { id: truePrimary.id },
        { linkedId: truePrimary.id },
      ],
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });
}

function shouldCreateNewSecondary(
  existingContacts: Contact[], 
  email?: string, 
  phoneNumber?: string
): boolean {
  // Check if exact combination already exists
  const exactMatch = existingContacts.some(contact =>
    contact.email === email && 
    contact.phoneNumber === phoneNumber &&
    contact.deletedAt === null
  );
  
  return !exactMatch && (!!email || !!phoneNumber);
}

export const consolidateContact = (
  contacts: Contact[]
): ConsolidatedContactResponse['contact'] => {
  if (contacts.length === 0) {
    throw new Error('No contacts to consolidate.');
  }

  const primaryContact = contacts.find(c => c.linkPrecedence === 'primary') 
    || contacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  const emails = new Set<string>();
  const phoneNumbers = new Set<string>();
  const secondaryContactIds: number[] = [];

  contacts.forEach(contact => {
    if (contact.email) emails.add(contact.email);
    if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    
    if (contact.id !== primaryContact.id) {
      secondaryContactIds.push(contact.id);
    }
  });

  return {
    primaryContatctId: primaryContact.id,
    emails: Array.from(emails),
    phoneNumbers: Array.from(phoneNumbers),
    secondaryContactIds: secondaryContactIds.sort(),
  };
};