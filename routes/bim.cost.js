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
    console.log('input parameter is not correct.');
    res.status(400).end('input parameter is not correct.');
    return; 
  }  

  let costUrl = null;
  const costType = req.query.costType;
  switch( costType ){
    case 'budgets':{
      costUrl =  config.bim360Cost.URL.BUDGETS_URL.format(containerId);
      break;
    };
    case 'contracts':{
      costUrl =  config.bim360Cost.URL.CONTRACTS_URL.format(containerId);
      break;
    }
    case 'costitems':{
      costUrl =  config.bim360Cost.URL.COSTITEMS_URL.format(containerId);
      break;
    }  
    case 'changeorders':{
      const orderType = req.query.orderType;
      costUrl =  config.bim360Cost.URL.CHANGEORDERS_URL.format(containerId, orderType);
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
/// get different data of cost type
/////////////////////////////////////////////////////////////////////////////////////////////
router.post('/cost/info',jsonParser, async function (req, res) {
  const containerId = req.body.costContainerId;
  if(!containerId){  
    console.log('input parameter is not correct.');
    res.status(400).end('input parameter is not correct.');
    return; 
  }  

  let costUrl = null;
  const costType = req.body.costType;
  const entityId = req.body.data.id;
  switch( costType ){
    case '#budget':{
      costUrl =  config.bim360Cost.URL.BUDGET_URL.format(containerId, entityId);
      break;
    };
    case '#contract':{
      costUrl =  config.bim360Cost.URL.CONTRACT_URL.format(containerId, entityId);
      break;
    }
    case '#costitem':{
      costUrl =  config.bim360Cost.URL.COSTITEM_URL.format(containerId, entityId);
      break;
    }  
    case '#changeorder':{
      const orderType = req.query.orderType;
      costUrl =  config.bim360Cost.URL.CHANGEORDER_URL.format(containerId, orderType, entityId);
      break;
    } 
  };
   try{
    const oauth = new OAuth(req.session);
    const internalToken = await oauth.getInternalToken();
    const costInfoRes = await apiClientCallAsync( 'PATCH',  costUrl, internalToken.access_token, );
    res.status(200).end(JSON.stringify(costInfoRes.body.results));
   }catch( err ){
    console.log('get exception while getting ' + costType + '. Error message is: ' + err.statusMessage )
    res.status(500).end(err.statusMessage);  
   }
})


/////////////////////////////////////////////////////////////////////////////////////////////
/// get read data for the input Id 
/////////////////////////////////////////////////////////////////////////////////////////////
router.get('/bim360/v1/type/:typeId/id/:valueId', jsonParser, async function(req, res){
  const typeId = req.params.typeId;
  const valueId = req.params.valueId.split(' ').join('');

  let requestUrl = null;

  let tokenType = TokenType.TWOLEGGED;

  switch (typeId) {
    case 'companyId': {
      const params = req.query.projectHref.split('/');
      const projectId = params[params.length - 1];
      const pureProjectId = projectId.split('b.').join('');
      requestUrl = config.accountv1.URL.COMPANY_URL.format(pureProjectId);
      tokenType = TokenType.TWOLEGGED;
      break;
    }
    case 'creatorId':
    case 'changedBy':
    case 'contactId':
    case 'signedBy':
    case 'recipients':
    case 'ownerId': {
      requestUrl = config.accountv1.URL.USER_URL.format(valueId);
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
    case 'budgetId':{
      var containerId = req.query.costContainerId;
      if(!containerId){  
        console.log('input parameter is not correct.');
        res.status(400).end('input parameter is not correct.');
        return; 
      }  
      requestUrl = config.bim360Cost.URL.BUDGETS_URL.format(containerId, valueId);
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
      token = oauth_token.access_token
    }else{
      token = await oauth.getInternalToken();
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
  
  var userSession = new UserSession(req.session);
  if (!userSession.isAuthorized()) {
    res.status(401).end('Please login first');
    return; 
  }  
  var params      = req.body.projectHref.split('/');
  var projectId   = params[params.length - 1];
  var containerId = bimDatabase.getCostContainerId(projectId) 

  if(!containerId){  
      console.log('failed to find ContainerId');
      res.status(500).end();
      return; 
  }  
  let associationType = null;
  switch (req.body.associationType) {
    case '#budget': {
      associationType = 'Budget';
      break;
    }
    case '#contract': {
      associationType = 'Contract';
      break;
    }
    case '#costitem': {
      associationType = 'CostItem';
      break;
    }
    case '#changeorder': {
      associationType = 'FormInstance';
      break;
    }
  }

  var input = {
    credentials:userSession.getUserServerCredentials(),  
    containerId:containerId,
    qs:{
      associationId: req.body.associationId,
      associationType: associationType
    },
    data:[{
      // interesting, it always add '\r' at the end of the string, workaround for now.
      propertyDefinitionId: req.body.attributeId.split('\r').join(''),
      value: req.body.attributeValue.split('\r').join('')
    }]
   };   

  try {
    var response = await costWrite.updateCustomAttribute(input);
    if (response === null) {
      console.log('Failed to update custom attribute: '+ req.body.attributeId + ' : ' + req.body.attributeValue)
      res.status(500).end("Failed to update custom attribute");
    }
    res.status(200).json(JSON.stringify(response));
  } catch (err) {
    console.log('get exception while updating custom attribute: '+ req.body.attributeId + ' : ' + req.body.attributeValue)
    res.status(500).end(err.statusMessage);
  }
})

/////////////////////////////////////////////////////////////////////////////////////////////
/// get budget properties 
/////////////////////////////////////////////////////////////////////////////////////////////
// router.get('/cost/budgets',jsonParser, async function (req, res) {
  
//   var params = req.query.projectHref.split('/');
//   var projectId = params[params.length - 1];
//   var containerId = bimDatabase.getCostContainerId(projectId) 

//   if(!containerId){  
//       console.log('failed to find ContainerId');
//       res.status(500).end();
//       return; 
//   }  

//   // Get the access token
//   const oauth = new OAuth(req.session);
//   const internalToken = await oauth.getInternalToken();
  


//    try{

//     const oauth = new OAuth(req.session);
//     const internalToken = await oauth.getInternalToken();

//     const budgetsUrl =  bim360Cost.URL.BUDGETS_RUL.format('de605561-7ad8-11e8-9d12-afb30ac3c34f');

//     const budgetsRes = await apiClientCallAsync( 'GET',  budgetsUrl, internalToken.access_token);
//     res.status(200).end(JSON.stringify(budgetsRes.body.results));

//    }catch( err ){
//     console.log('get exception while fetching budgets')
//     res.status(500).end(err.statusMessage);  
//    }
// })

/////////////////////////////////////////////////////////////////////////////////////////////
/// update budget properties
/////////////////////////////////////////////////////////////////////////////////////////////
router.post('/cost/budget',jsonParser, async function (req, res) {
  
  var userSession = new UserSession(req.session);
  if (!userSession.isAuthorized()) {
    res.status(401).end('Please login first');
    return; 
  }  
  var requestBody = req.body.requestBody;
  var params      = req.body.projectHref.split('/');
  var projectId = params[params.length - 1];
  var containerId = bimDatabase.getCostContainerId(projectId) 

  if(!containerId){  
      console.log('failed to find ContainerId');
      res.status(500).end();
      return; 
  }  

  var input = {
    credentials:userSession.getUserServerCredentials(),  
    containerId:containerId,
    data:requestBody
   };   

   try{
    var response = await costWrite.updateBudget(input );
    if(response === null){
      console.log('Failed to update budget.')
      res.status(500).end("Failed to update budget.");  
    }
    res.status(200).json(JSON.stringify(response.body.results)); 
   }catch( err ){
    console.log('get exception while updating budget item')
    res.status(500).end(err.statusMessage);  
   }
})

/////////////////////////////////////////////////////////////////////////////////////////////
/// get contract properties 
/////////////////////////////////////////////////////////////////////////////////////////////
// router.get('/cost/contracts',jsonParser, async function (req, res) {
  
//   var userSession = new UserSession(req.session);
//   if (!userSession.isAuthorized()) {
//     res.status(401).end('Please login first');
//     return; 
//   }  
//   var params = req.query.projectHref.split('/');
//   var projectId = params[params.length - 1];
//   var containerId = bimDatabase.getCostContainerId(projectId) 
//   console.log("project id:" + projectId);
//   console.log("cost container id:" + containerId);

//   if(!containerId){  
//       console.log('failed to find ContainerId');
//       res.status(500).end();
//       return; 
//   }  

//   var input = {
//     credentials:userSession.getUserServerCredentials(),  
//     containerId:containerId
//    };   

//    try{
//     var response = await costRead.getContracts(input );
//     console.log(response)
//     res.status(200).json(JSON.stringify(response.body.results)); 
//    }catch( err ){
//     console.log('get exception while fetching budgets')
//     res.status(500).end(err.statusMessage);  
//    }
// })

/////////////////////////////////////////////////////////////////////////////////////////////
/// update the contract properties
/////////////////////////////////////////////////////////////////////////////////////////////
router.post('/cost/contract',jsonParser, async function (req, res) {
  
  var userSession = new UserSession(req.session);
  if (!userSession.isAuthorized()) {
    res.status(401).end('Please login first');
    return; 
  }  
  var requestBody = req.body.requestBody;
  var params      = req.body.projectHref.split('/');
  var projectId = params[params.length - 1];
  var containerId = bimDatabase.getCostContainerId(projectId) 

  if(!containerId){  
      console.log('failed to find ContainerId');
      res.status(500).end();
      return; 
  }  

  var input = {
    credentials:userSession.getUserServerCredentials(),  
    containerId:containerId,
    data:requestBody
   };   

   try{
    var response = await costWrite.updateContract(input );
    if(response === null){
      console.log('Failed to update contract.')
      res.status(500).end("Failed to update contract.");  
    }
    res.status(200).json(JSON.stringify(response.body.results)); 
   }catch( err ){
    console.log('get exception while updating contract: '+ input.requestBody.name)
    res.status(500).end(err.statusMessage);  
   }
})

/////////////////////////////////////////////////////////////////////////////////////////////
/// get cost item properties
/////////////////////////////////////////////////////////////////////////////////////////////
// router.get('/cost/costitem',jsonParser, async function (req, res) {
  
//   var userSession = new UserSession(req.session);
//   if (!userSession.isAuthorized()) {
//     res.status(401).end('Please login first');
//     return; 
//   }  
//   var params = req.query.projectHref.split('/');
//   var projectId = params[params.length - 1];
//   var containerId = bimDatabase.getCostContainerId(projectId) 
//   console.log("project id:" + projectId);
//   console.log("cost container id:" + containerId);

//   if(!containerId){  
//       console.log('failed to find ContainerId');
//       res.status(500).end();
//       return; 
//   }  

//   var input = {
//     credentials:userSession.getUserServerCredentials(),  
//     containerId:containerId
//    };
   
//    console.log(input);

//    try{
//     var response = await costRead.getCostItems(input );
//     console.log(response)
//     res.status(200).json(JSON.stringify(response.body.results)); 
//    }catch( err ){
//     console.log('get exception while fetching cost items')
//     res.status(500).end(err.statusMessage);  
//    }
// })

/////////////////////////////////////////////////////////////////////////////////////////////
/// update the cost item properties
/////////////////////////////////////////////////////////////////////////////////////////////
router.post('/cost/costitem',jsonParser, async function (req, res) {
  
  var userSession = new UserSession(req.session);
  if (!userSession.isAuthorized()) {
    res.status(401).end('Please login first');
    return; 
  }  
  var requestBody = req.body.requestBody;
  var params      = req.body.projectHref.split('/');
  var projectId = params[params.length - 1];
  var containerId = bimDatabase.getCostContainerId(projectId) 

  if(!containerId){  
      console.log('failed to find ContainerId');
      res.status(500).end();
      return; 
  }  

  var input = {
    credentials:userSession.getUserServerCredentials(),  
    containerId:containerId,
    data:requestBody
   };   

   try{
    var response = await costWrite.updateCostItem(input );
    if(response === null){
      console.log('Failed to update cost item.')
      res.status(500).end("Failed to update cost item.");  
    }
    res.status(200).json(JSON.stringify(response.body.results)); 
   }catch( err ){
    console.log('get exception while updating contract.')
    res.status(500).end(err.statusMessage);  
   }
})

/////////////////////////////////////////////////////////////////////////////////////////////
/// get change orders 
/////////////////////////////////////////////////////////////////////////////////////////////
// router.get('/cost/changeorder',jsonParser, async function (req, res) {
//   var userSession = new UserSession(req.session);
//   if (!userSession.isAuthorized()) {
//     console.log('failed to get access token');
//     res.status(401).end('Please login first');
//     return;
//   }  
//   var params = req.query.projectHref.split('/');
//   var projectId = params[params.length - 1];
//   var containerId = bimDatabase.getCostContainerId(projectId);
//   var orderType = req.query.orderType; 
//   if(!containerId){  
//       console.log('failed to find ContainerId');
//       res.status(500).end();
//       return; 
//   }  

//   var input = {
//     credentials:userSession.getUserServerCredentials(),  
//     containerId:containerId,
//     orderType:orderType
//    };   

//    try{
//     var response = await costRead.getChangeOrders(input );
//     res.status(200).json(JSON.stringify(response.body.results)); 
//    }catch( err ){
//     console.log('get exception while fetching budgets')
//     res.status(500).end(err.statusMessage);  
//    }
//    return;
// })

/////////////////////////////////////////////////////////////////////////////////////////////
/// update the properties of change order
/////////////////////////////////////////////////////////////////////////////////////////////
router.post('/cost/changeorder',jsonParser, async function (req, res) {
  
  var userSession = new UserSession(req.session);
  if (!userSession.isAuthorized()) {
    res.status(401).end('Please login first');
    return; 
  }  
  var requestBody = req.body.requestBody;
  var params      = req.body.projectHref.split('/');
  var orderType   = req.body.orderType; 
  var projectId = params[params.length - 1];
  var containerId = bimDatabase.getCostContainerId(projectId) 

  if(!containerId){  
      console.log('failed to find ContainerId');
      res.status(500).end();
      return; 
  }  

  var input = {
    credentials:userSession.getUserServerCredentials(),  
    containerId:containerId,
    orderType:orderType,
    data:requestBody
   };   

   try{
    var response = await costWrite.updateChangeOrder(input );
    if(response === null){
      console.log('Failed to update change order.')
      res.status(500).end("Failed to update change order.");  
    }
    res.status(200).json(JSON.stringify(response.body.results)); 
   }catch( err ){
    console.log('get exception while updating contract.')
    res.status(500).end(err.statusMessage);  
   }
})




/////////////////////////////////////////////////////////////////////////////////////////////
/// get status 
/////////////////////////////////////////////////////////////////////////////////////////////
// router.get('/cost/statuses',jsonParser, async function (req, res) {
  
//   if( costStatuses !== null ){
//     res.status(200).json(JSON.stringify(costStatuses)); 
//     return;
//   }
//   var userSession = new UserSession(req.session);
//   if (!userSession.isAuthorized()) {
//     res.status(401).end('Please login first');
//     return; 
//   }  
//   var params = req.query.projectHref.split('/');
//   var projectId = params[params.length - 1];
//   var containerId = bimDatabase.getCostContainerId(projectId);
//   console.log("project id:" + projectId);
//   console.log("cost container id:" + containerId);

//   if(!containerId){  
//       console.log('failed to find ContainerId');
//       res.status(500).end();
//       return; 
//   }  

//   var input = {
//     credentials:userSession.getUserServerCredentials(),  
//     containerId:containerId
//    };   

//    console.log(input);

//    try{
//     var response = await costRead.getCostStatuses(input );
//     console.log(response)
//     costStatuses = response.body;
//     res.status(200).json(JSON.stringify(costStatuses)); 
//    }catch( err ){
//     console.log('get exception while fetching budgets')
//     res.status(500).end(err.statusMessage);  
//    }
// })



module.exports = router