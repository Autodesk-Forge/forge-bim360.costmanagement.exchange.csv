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

'use strict';   


var express = require('express'); 
var router = express.Router(); 

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json(); 
var config = require('../config'); 

const { apiClientCallAsync } = require('./common/bim.cost.imp');
const { OAuth } = require('./common/oauth');


/////////////////////////////////////////////////////////////////////////////
// Add String.format() method if it's not existing
if (!String.prototype.format) {
  String.prototype.format = function () {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function (match, number) {
          return typeof args[number] != 'undefined'
              ? args[number]
              : match
              ;
      });
  };
}


const TokenType = {
  TWOLEGGED: 0,
  THREELEGGED: 1,
  NOT_SUPPORTED: 9
}


/////////////////////////////////////////////////////////////////////////////////////////////
/// get different data of cost type
/////////////////////////////////////////////////////////////////////////////////////////////
router.get('/cost/info',jsonParser, async function (req, res) {
  const containerId = req.query.costContainerId;
  if(!containerId){  
    console.log('cost container id is not provide.');
    res.status(400).end('cost container id is not provide.');
    return; 
  }  

  let costUrl = null;
  const costType = req.query.costType;
  switch( costType ){
    case 'budget':{
      costUrl =  config.bim360Cost.URL.BUDGETS_URL.format(containerId);
      break;
    };
    case 'contract':{
      costUrl =  config.bim360Cost.URL.CONTRACTS_URL.format(containerId);
      break;
    }
    case 'costitem':{
      costUrl =  config.bim360Cost.URL.COSTITEMS_URL.format(containerId);
      break;
    }  
    case 'pco':
    case 'rfq':
    case 'rco':
    case 'oco':
    case 'sco':{
      costUrl =  config.bim360Cost.URL.CHANGEORDERS_URL.format(containerId, costType);
      break;
    } 
  };
   try{
    const oauth = new OAuth(req.session);
    const internalToken = await oauth.getInternalToken();
    const costInfoRes = await apiClientCallAsync( 'GET',  costUrl, internalToken.access_token);
    res.status(200).end(JSON.stringify(costInfoRes.body.results));
   }catch( err ){
    console.log('get exception while getting ' + costType + '. Error message is: ' + err.statusMessage )
    res.status(500).end(err.statusMessage);  
   }
})



/////////////////////////////////////////////////////////////////////////////////////////////
/// update cost data
/////////////////////////////////////////////////////////////////////////////////////////////
router.post('/cost/info',jsonParser, async function (req, res) {
  const containerId = req.body.costContainerId;
  const costType = req.body.costType;
  const requestData = req.body.requestData;
  if(!containerId || !costType || !requestData || !requestData.id){  
    console.log('missing parameters in request body');
    res.status(400).end('missing parameters in request body');
    return; 
  }  

  let costUrl = null;
  switch( costType ){
    case 'budget':{
      costUrl =  config.bim360Cost.URL.BUDGET_URL.format(containerId, requestData.id);
      break;
    };
    case 'contract':{
      costUrl =  config.bim360Cost.URL.CONTRACT_URL.format(containerId, requestData.id);
      break;
    }
    case 'costitem':{
      costUrl =  config.bim360Cost.URL.COSTITEM_URL.format(containerId, requestData.id);
      break;
    }  
    case 'pco':
    case 'rfq':
    case 'rco':
    case 'oco':
    case 'sco': {
      costUrl =  config.bim360Cost.URL.CHANGEORDER_URL.format(containerId, costType, requestData.id);
      break;
    } 
  };
   try{
    const oauth = new OAuth(req.session);
    const internalToken = await oauth.getInternalToken();
    const costInfoRes = await apiClientCallAsync( 'PATCH',  costUrl, internalToken.access_token, req.body.requestData );
    res.status(200).end(JSON.stringify(costInfoRes.body));
   }catch( err ){
    console.log('get exception while updating ' + costType + '. Error message is: ' + err.statusMessage )
    res.status(500).end(err.statusMessage);  
   }
})


/////////////////////////////////////////////////////////////////////////////////////////////
/// get read data for the input Id 
/////////////////////////////////////////////////////////////////////////////////////////////
router.get('/bim360/v1/type/:typeId/id/:valueId', jsonParser, async function(req, res){
  const typeId = req.params.typeId;
  const valueId = req.params.valueId;
  // const valueId = req.params.valueId.split(' ').join('');

  let requestUrl = null;

  let tokenType = TokenType.TWOLEGGED;

  switch (typeId) {
    case 'companyId': {
      const params = req.query.projectHref.split('/');
      if(params.length < 3){
        console.log('input project id is not correct.');
        res.status(400).end('input project is not correct.');
        return; 
      }
      const projectId = params[params.length - 1];
      const pureProjectId = projectId.split('b.').join('');
      const hubId = params[params.length - 3];
      const accountId = hubId.split('b.').join('');
      requestUrl = config.accountv1.URL.COMPANY_URL.format(accountId, pureProjectId);
      tokenType = TokenType.TWOLEGGED;
      break;
    }
    case 'creatorId':
    case 'changedBy':
    case 'contactId':
    case 'signedBy':
    case 'recipients':
    case 'ownerId': {
      const params = req.query.projectHref.split('/');
      if(params.length < 3){
        console.log('input project id is not correct.');
        res.status(400).end('input project is not correct.');
        return; 
      }
      const hubId = params[params.length - 3];
      const accountId = hubId.split('b.').join('');
      requestUrl = config.accountv1.URL.USER_URL.format(accountId, valueId);
      tokenType = TokenType.TWOLEGGED;
      break;
    }

    case 'contractId': {
      var containerId = req.query.costContainerId;
      if(!containerId){  
          console.log('input parameter is not correct.');
          res.status(400).end('input parameter is not correct.');
          return; 
      }
      requestUrl = config.bim360Cost.URL.CONTRACT_URL.format(containerId, valueId);
      tokenType = TokenType.THREELEGGED;
      break;
    }

    case 'parentId': 
    case 'rootId':
    case 'budgets':
    case 'budget':
    case 'budgetId':{
      var containerId = req.query.costContainerId;
      if(!containerId){  
        console.log('input parameter is not correct.');
        res.status(400).end('input parameter is not correct.');
        return; 
      }  
      requestUrl = config.bim360Cost.URL.BUDGET_URL.format(containerId, valueId);
      tokenType = TokenType.THREELEGGED;
      break;
    }
  }
  try {
    const oauth = new OAuth(req.session);
    let token = null;
    if( tokenType === TokenType.TWOLEGGED ){
      const oauth_client = oauth.get2LeggedClient(); 
      const oauth_token = await oauth_client.authenticate();
      token = oauth_token.access_token;
    }else{
      const oauth_token = await oauth.getInternalToken();
      token = oauth_token.access_token;
    }
    const response = await apiClientCallAsync( 'GET',  requestUrl, token);
    let detailRes = response.body;
    // handle 'companyId' as a special case
    let companyInfo = {};
    if(typeId === 'companyId' ){
      for( let companyItem in detailRes ){
        if( detailRes[companyItem].member_group_id === valueId ){
          companyInfo.name = detailRes[companyItem].name;
          break;
        }
      }
      detailRes = companyInfo;
    }
    res.status(200).json(JSON.stringify(detailRes));
  } catch (err) {
    console.log("failed to get the data for " + typeId + "." + valueId)
    res.status(500).end(err.statusMessage);
  }
})


/////////////////////////////////////////////////////////////////////////////////////////////
/// update the custom attributes
/////////////////////////////////////////////////////////////////////////////////////////////
router.post('/cost/attribute',jsonParser, async function (req, res) {
  const containerId = req.body.costContainerId;
  const requestData = req.body.requestData;
  if(!containerId || !requestData){  
    console.log('containerId or requestData is not provided.');
    res.status(400).end('containerId or requestData is not provided in request body.');
    return; 
  }  
  const costUrl = config.bim360Cost.URL.CUSTOM_ATTRIBUTE_URL.format(containerId);

  try {
    const oauth = new OAuth(req.session);
    const internalToken = await oauth.getInternalToken();
    const costInfoRes = await apiClientCallAsync('POST', costUrl, internalToken.access_token, requestData);
    res.status(200).end(JSON.stringify(costInfoRes.body));
  } catch (err) {
    console.log('get exception while updating, error message is: ' + err.statusMessage)
    res.status(500).end(err.statusMessage);
  }
})


module.exports = router