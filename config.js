/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

// Autodesk Forge configuration
module.exports = {
    // Set environment variables or hard-code here
    credentials: {
        client_id: process.env.FORGE_CLIENT_ID,
        client_secret: process.env.FORGE_CLIENT_SECRET,
        callback_url: process.env.FORGE_CALLBACK_URL
    },
    scopes: {
        // Required scopes for the server-side application
        internal: ['bucket:create', 'bucket:read', 'data:read', 'data:create', 'data:write'],

        // Required scopes for the server-side BIM360 Account Admin
        internal_2legged: ['data:read', 'bucket:read', 'bucket:create', 'data:write', 'bucket:delete', 'account:read', 'account:write'],

        // Required scope for the client-side viewer
        public: ['viewables:read']
    },
    accountv1:{
        URL:{
            COMPANY_URL: "https://developer.api.autodesk.com/hq/v1/accounts/"+process.env.BIM360_ACCOUNT_ID+"/projects/{0}/companies",
            USER_URL: "https://developer.api.autodesk.com/hq/v1/accounts/"+process.env.BIM360_ACCOUNT_ID+"/users/{0}",
        }
      },
    
    bim360Cost:{
        URL:{
            BUDGETS_URL:        "https://developer.api.autodesk.com/cost/v1/containers/{0}/budgets",
            BUDGET_URL:        "https://developer.api.autodesk.com/cost/v1/containers/{0}/budgets/{1}",

            CONTRACTS_URL:      "https://developer.api.autodesk.com/cost/v1/containers/{0}/contracts",
            CONTRACT_URL:       "https://developer.api.autodesk.com/cost/v1/containers/{0}/contracts/{1}",
            
            COSTITEMS_URL:      "https://developer.api.autodesk.com/cost/v1/containers/{0}/cost-items",
            COSTITEM_URL:       "https://developer.api.autodesk.com/cost/v1/containers/{0}/cost-items/{1}",
            
            CHANGEORDERS_URL:   "https://developer.api.autodesk.com/cost/v1/containers/{0}/change-orders/{1}",
            CHANGEORDER_URL:    "https://developer.api.autodesk.com/cost/v1/containers/{0}/change-orders/{1}/{2}",
        }
    },
    
};
