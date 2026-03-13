#!/usr/bin/env node

/**
 * Instantly → GoHighLevel Automation Script
 * Processes interested leads from Instantly and creates them in GHL
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const CONFIG = {
  INSTANTLY: {
    API_KEY: 'MzQ0ODcyMDktNGYxNC00NTVhLWI4MDUtNDFhM2M2Y2NiYWNlOlpyaUdsSlpHeWdXeg==',
    BASE_URL: 'https://api.instantly.ai/api/v2',
  },
  GHL: {
    API_KEY: 'pit-4ae0985d-8de0-40e6-b688-4e6805e57c58',
    LOCATION_ID: '3zMwpehG9y8ETJsZtR3d',
    BASE_URL: 'https://services.leadconnectorhq.com',
    VERSION: '2021-07-28',
    USER_AGENT: 'Mozilla/5.0',
    RATE_LIMIT_DELAY: 5000, // 5 seconds between requests
  },
  PIPELINE: {
    RESTAURANTS: 'oNcLIG8SGY8IKvvVbkDe',
    STAGES: {
      NEW_LEAD: '00f6970c',
      CONTACTED: 'ce9827b8',
      INTERESTED: '0415b950',
      GOT_NUMBER: '92f6c992',
      MEETING_BOOKED: '31ec1845',
      PITCHED: 'c2e2d40f',
      CONTRACT_SENT: '575ff710',
      WON: '4181cae2',
      LOST: '498f3f6a',
    },
  },
  CUSTOM_FIELDS: {
    LEAD_SOURCE: 'dLDNSAZYHk5qihoOx5oP',
    CURRENT_PROVIDER: 'gziZOwyG3l2wDoxIyFVM',
    REFERRED_BY: 'UfEyphJB68b2zlxoMvXW',
    PHONE_SOURCE: 'i1zLB9YndvgIPXIACvZA',
  },
};

// Utilities
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Instantly API functions
async function getInstantlyCampaigns() {
  const url = new URL(`${CONFIG.INSTANTLY.BASE_URL}/campaigns/list`);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CONFIG.INSTANTLY.API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  return makeRequest(options);
}

async function getInstantlyLeads(campaignId) {
  const url = new URL(`${CONFIG.INSTANTLY.BASE_URL}/campaigns/${campaignId}/leads`);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CONFIG.INSTANTLY.API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  await delay(2000); // Rate limiting
  return makeRequest(options);
}

async function getInstantlyConversation(campaignId, leadEmail) {
  const url = new URL(`${CONFIG.INSTANTLY.BASE_URL}/emails/list`);
  url.searchParams.set('campaign_id', campaignId);
  url.searchParams.set('lead_email', leadEmail);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CONFIG.INSTANTLY.API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  await delay(2000); // Rate limiting
  
  try {
    return await makeRequest(options);
  } catch (error) {
    // If conversation fetch fails, continue without it
    console.log(`⚠️  Could not fetch conversation for ${leadEmail}: ${error.message}`);
    return { data: [] };
  }
}

// GoHighLevel API functions
async function searchGHLContact(email) {
  const url = new URL(`${CONFIG.GHL.BASE_URL}/contacts/`);
  url.searchParams.set('locationId', CONFIG.GHL.LOCATION_ID);
  url.searchParams.set('query', email);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CONFIG.GHL.API_KEY}`,
      'Version': CONFIG.GHL.VERSION,
      'User-Agent': CONFIG.GHL.USER_AGENT,
      'Content-Type': 'application/json',
    },
  };

  await delay(CONFIG.GHL.RATE_LIMIT_DELAY); // Rate limiting
  return makeRequest(options);
}

async function createGHLContact(contactData) {
  const url = new URL(`${CONFIG.GHL.BASE_URL}/contacts`);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.GHL.API_KEY}`,
      'Version': CONFIG.GHL.VERSION,
      'User-Agent': CONFIG.GHL.USER_AGENT,
      'Content-Type': 'application/json',
    },
  };

  await delay(CONFIG.GHL.RATE_LIMIT_DELAY); // Rate limiting
  return makeRequest(options, contactData);
}

async function updateGHLContact(contactId, contactData) {
  const url = new URL(`${CONFIG.GHL.BASE_URL}/contacts/${contactId}`);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${CONFIG.GHL.API_KEY}`,
      'Version': CONFIG.GHL.VERSION,
      'User-Agent': CONFIG.GHL.USER_AGENT,
      'Content-Type': 'application/json',
    },
  };

  await delay(CONFIG.GHL.RATE_LIMIT_DELAY); // Rate limiting
  return makeRequest(options, contactData);
}

async function createGHLOpportunity(opportunityData) {
  const url = new URL(`${CONFIG.GHL.BASE_URL}/opportunities`);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.GHL.API_KEY}`,
      'Version': CONFIG.GHL.VERSION,
      'User-Agent': CONFIG.GHL.USER_AGENT,
      'Content-Type': 'application/json',
    },
  };

  await delay(CONFIG.GHL.RATE_LIMIT_DELAY); // Rate limiting
  return makeRequest(options, opportunityData);
}

async function addGHLNote(contactId, note) {
  const url = new URL(`${CONFIG.GHL.BASE_URL}/contacts/${contactId}/notes`);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.GHL.API_KEY}`,
      'Version': CONFIG.GHL.VERSION,
      'User-Agent': CONFIG.GHL.USER_AGENT,
      'Content-Type': 'application/json',
    },
  };

  await delay(CONFIG.GHL.RATE_LIMIT_DELAY); // Rate limiting
  return makeRequest(options, { body: note });
}

// Data enrichment functions
async function enrichContactData(lead) {
  console.log(`Enriching data for: ${lead.email}`);
  
  // Extract business name from email domain
  const domain = lead.email.split('@')[1];
  let businessName = '';
  let website = '';
  
  if (domain) {
    website = `https://${domain}`;
    
    try {
      // Try to fetch business name from domain
      const response = await fetch(website);
      if (response.ok) {
        const html = await response.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          businessName = titleMatch[1].trim()
            .replace(/\s*[-|–—]\s*.*/g, '') // Remove taglines after dash
            .replace(/\s*\|\s*.*/g, '') // Remove taglines after pipe
            .trim();
        }
      }
    } catch (error) {
      console.log(`Could not fetch website for ${domain}:`, error.message);
    }
    
    // Fallback: capitalize domain name
    if (!businessName) {
      businessName = domain
        .replace(/\.(com|net|org|io|co)$/i, '')
        .split('.')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  return {
    ...lead,
    businessName: lead.company || businessName,
    website: lead.website || website,
  };
}

function extractPhoneFromContent(emailContent) {
  const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const match = phoneRegex.exec(emailContent);
  if (match) {
    return match[0].replace(/[^\d+]/g, '');
  }
  return null;
}

function detectCurrentProvider(emailContent, campaignName = '') {
  const content = (emailContent + ' ' + campaignName).toUpperCase();
  
  if (content.includes('SPOTHOPPER')) return 'SpotHopper';
  if (content.includes('OWNER.COM') || content.includes('OWNER COM')) return 'Owner.com';
  if (content.includes('BENTOBOX')) return 'BentoBox';
  if (content.includes('POPMENU')) return 'PopMenu';
  if (content.includes('FISHERMAN')) return 'Fisherman';
  if (content.includes('GRUBHUB')) return 'GrubHub';
  if (content.includes('DOORDASH')) return 'DoorDash';
  if (content.includes('UBEREATS')) return 'Uber Eats';
  
  return null;
}

function groupEmailsByDay(emails) {
  const grouped = {};
  
  emails.forEach(email => {
    const date = new Date(email.timestamp_email || email.timestamp);
    const day = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!grouped[day]) {
      grouped[day] = [];
    }
    
    grouped[day].push(email);
  });
  
  return grouped;
}

function formatDailyNote(day, emails) {
  const date = new Date(day).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  let note = `=== ${date} ===\n\n`;
  
  emails.forEach(email => {
    const time = new Date(email.timestamp_email || email.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const direction = email.ue_type === 2 ? 'INBOUND' : 'OUTBOUND';
    const from = email.from_address_email || email.from;
    const preview = email.content_preview || email.message || '';
    
    note += `**${time} - ${direction}**\n`;
    note += `From: ${from}\n`;
    note += `Preview: ${preview}\n\n`;
  });
  
  return note;
}

// Main processing function
async function processLead(lead, campaignData = {}) {
  try {
    console.log(`\n🔄 Processing lead: ${lead.email}`);
    
    // Enrich contact data
    const enrichedLead = await enrichContactData(lead);
    
    // Check if contact already exists in GHL
    let existingContact = null;
    try {
      const searchResult = await searchGHLContact(enrichedLead.email);
      if (searchResult && searchResult.contacts && searchResult.contacts.length > 0) {
        existingContact = searchResult.contacts.find(contact => 
          contact.email && contact.email.toLowerCase() === enrichedLead.email.toLowerCase()
        );
        if (existingContact) {
          console.log(`✅ Found existing contact: ${existingContact.id}`);
        }
      }
    } catch (error) {
      console.log(`ℹ️  Contact search failed (likely new contact): ${error.message}`);
    }
    
    // Get conversation history from Instantly
    let conversationHistory = [];
    let currentProvider = null;
    let phoneNumber = null;
    
    try {
      const conversation = await getInstantlyConversation(
        campaignData.campaign_id || lead.campaign_id,
        enrichedLead.email
      );
      
      if (conversation && conversation.data) {
        conversationHistory = conversation.data;
        
        // Extract phone and provider from email content
        conversationHistory.forEach(email => {
          const content = email.content_preview || email.message || '';
          if (!phoneNumber) {
            phoneNumber = extractPhoneFromContent(content);
          }
          if (!currentProvider) {
            currentProvider = detectCurrentProvider(content, campaignData.campaign_name || '');
          }
        });
      }
    } catch (error) {
      console.log(`⚠️  Could not fetch conversation history: ${error.message}`);
    }
    
    // Prepare contact data for GHL
    const contactData = {
      locationId: CONFIG.GHL.LOCATION_ID,
      firstName: enrichedLead.firstName || enrichedLead.name?.split(' ')[0] || '',
      lastName: enrichedLead.lastName || enrichedLead.name?.split(' ').slice(1).join(' ') || '',
      email: enrichedLead.email,
      phone: phoneNumber || enrichedLead.phone || '',
      companyName: enrichedLead.businessName || '',
      website: enrichedLead.website || '',
      source: 'Cold Email',
      tags: ['Instantly Import', 'Restaurant'],
      customFields: [
        {
          key: CONFIG.CUSTOM_FIELDS.LEAD_SOURCE,
          field_value: 'Cold Email'
        }
      ]
    };
    
    // Add current provider if detected
    if (currentProvider) {
      contactData.customFields.push({
        key: CONFIG.CUSTOM_FIELDS.CURRENT_PROVIDER,
        field_value: currentProvider
      });
      contactData.tags.push(currentProvider);
    }
    
    // Add phone source if phone was found
    if (phoneNumber) {
      contactData.customFields.push({
        key: CONFIG.CUSTOM_FIELDS.PHONE_SOURCE,
        field_value: 'Given by Lead'
      });
    }
    
    // Create or update contact
    let contact;
    if (existingContact) {
      // Remove locationId for updates
      const updateData = { ...contactData };
      delete updateData.locationId;
      contact = await updateGHLContact(existingContact.id, updateData);
      contact = { contact: existingContact }; // Maintain consistent structure
      console.log(`✅ Updated existing contact`);
    } else {
      contact = await createGHLContact(contactData);
      console.log(`✅ Created new contact: ${contact.contact.id}`);
    }
    
    const contactId = existingContact?.id || contact.contact.id;
    
    // Create opportunity in RESTAURANTS pipeline
    const opportunityData = {
      locationId: CONFIG.GHL.LOCATION_ID,
      pipelineId: CONFIG.PIPELINE.RESTAURANTS,
      stageId: CONFIG.PIPELINE.STAGES.INTERESTED,
      status: 'open',
      title: `${enrichedLead.businessName || enrichedLead.email} - Restaurant Opportunity`,
      contactId: contactId,
      monetaryValue: 0,
      source: 'Cold Email',
    };
    
    try {
      const opportunity = await createGHLOpportunity(opportunityData);
      console.log(`✅ Created opportunity: ${opportunity.opportunity?.id || 'created'}`);
    } catch (error) {
      console.log(`⚠️  Could not create opportunity: ${error.message}`);
      // Don't fail the whole process if opportunity creation fails
    }
    
    // Create daily notes from conversation history
    if (conversationHistory.length > 0) {
      const dailyEmails = groupEmailsByDay(conversationHistory);
      
      for (const [day, emails] of Object.entries(dailyEmails)) {
        const note = formatDailyNote(day, emails);
        try {
          await addGHLNote(contactId, note);
          console.log(`✅ Added note for ${day}`);
        } catch (error) {
          console.log(`⚠️  Could not add note for ${day}: ${error.message}`);
        }
      }
    }
    
    return { success: true, contactId, currentProvider };
    
  } catch (error) {
    console.error(`❌ Error processing lead ${lead.email}:`, error);
    return { success: false, error: error.message };
  }
}

// Webhook handler function
async function handleWebhook(payload) {
  console.log('🎯 Handling Instantly webhook:', payload);
  
  const lead = {
    email: payload.email || payload.lead_email || payload.lead?.email,
    firstName: payload.firstName || payload.lead?.firstName,
    lastName: payload.lastName || payload.lead?.lastName,
    name: payload.name || payload.lead?.name,
    company: payload.company || payload.lead?.company,
    website: payload.website || payload.lead?.website,
    phone: payload.phone || payload.lead?.phone,
    campaign_id: payload.campaign_id || payload.campaign?.id,
  };
  
  if (!lead.email) {
    throw new Error('No email found in webhook payload');
  }
  
  const campaignData = {
    campaign_id: payload.campaign_id || payload.campaign?.id,
    campaign_name: payload.campaign_name || payload.campaign?.name,
  };
  
  return await processLead(lead, campaignData);
}

// Bulk backfill function
async function bulkBackfill() {
  console.log('🚀 Starting bulk backfill of interested leads...');
  
  try {
    // Get all campaigns
    const campaigns = await getInstantlyCampaigns();
    console.log(`📋 Found ${campaigns.length || 0} campaigns`);
    
    let totalProcessed = 0;
    let totalSuccess = 0;
    
    for (const campaign of campaigns) {
      console.log(`\n📧 Processing campaign: ${campaign.name}`);
      
      try {
        const leads = await getInstantlyLeads(campaign.id);
        const interestedLeads = leads.filter(lead => 
          lead.status === 'interested' || 
          lead.reply_status === 'interested'
        );
        
        console.log(`📝 Found ${interestedLeads.length} interested leads`);
        
        for (const lead of interestedLeads) {
          const result = await processLead(lead, {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
          });
          
          totalProcessed++;
          if (result.success) {
            totalSuccess++;
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing campaign ${campaign.name}:`, error);
      }
    }
    
    console.log(`\n🎉 Backfill complete! Processed: ${totalProcessed}, Success: ${totalSuccess}`);
    return { totalProcessed, totalSuccess };
    
  } catch (error) {
    console.error('❌ Bulk backfill failed:', error);
    throw error;
  }
}

// Webhook registration function
async function registerWebhook(webhookUrl) {
  const url = new URL(`${CONFIG.INSTANTLY.BASE_URL}/webhooks`);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.INSTANTLY.API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  const body = {
    url: webhookUrl,
    event: 'lead_interested',
  };

  console.log('📡 Registering webhook:', body);
  return makeRequest(options, body);
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'backfill':
        await bulkBackfill();
        break;
        
      case 'webhook':
        const webhookUrl = args[1];
        if (!webhookUrl) {
          console.error('Usage: node instantly-to-ghl.js webhook <webhook-url>');
          process.exit(1);
        }
        await registerWebhook(webhookUrl);
        console.log('✅ Webhook registered successfully');
        break;
        
      case 'test':
        const testLead = {
          email: 'test@restaurant.com',
          firstName: 'Test',
          lastName: 'Restaurant',
          campaign_id: 'test-campaign-123',
        };
        const result = await processLead(testLead);
        console.log('Test result:', result);
        break;
        
      default:
        console.log(`
📋 Instantly → GoHighLevel Integration

Commands:
  backfill          Process all existing interested leads
  webhook <url>     Register webhook with Instantly
  test              Test with sample lead

Examples:
  node instantly-to-ghl.js backfill
  node instantly-to-ghl.js webhook https://yourapp.com/api/instantly-webhook
        `);
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

// Export functions for webhook usage
module.exports = {
  handleWebhook,
  processLead,
  bulkBackfill,
  registerWebhook,
};

// Run CLI if called directly
if (require.main === module) {
  main();
}