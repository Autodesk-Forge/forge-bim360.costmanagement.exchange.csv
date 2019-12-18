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

var UserSession = require('../services/userSession');
var bimDatabase = require('../bim.database');
var costRead  = require('../services/bim.cost.services.read');
var costWrite = require('../services/bim.cost.services.write');

var oAuthServices = require('../services/oauth.services'); 


var costStatuses = null;
var twoLeggedToken = null;

/////////////////////////////////////////////////////////////////////////////////////////////
/// get budget properties 
/////////////////////////////////////////////////////////////////////////////////////////////
router.get('/cost/budgets',jsonParser, async function (req, res) {
  
  var userSession = new UserSession(req.session);
  if (!userSession.isAuthorized()) {
    res.status(401).end('Please login first');
    return; 
  }  
  var params = req.query.projectHref.split('/');
  var projectId = params[params.length - 1];
  var containerId = bimDatabase.getCostContainerId(projectId) 

  if(!containerId){  
      console.log('failed to find ContainerId');
      res.status(500).end();
      return; 
  }  

  var input = {
    credentials:userSession.getUserServerCredentials(),  
    containerId:containerId
   };   

   console.log(input)

   try{
    var response = await costRead.getBudgetItems(input );
    res.status(200).json(JSON.stringify(response.body.results)); 
   }catch( err ){
    console.log('get exception while fetching budgets')
    res.status(500).end(err.statusMessage);  
   }
})

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
router.get('/cost/contracts',jsonParser, async function (req, res) {
  
  var userSession = new UserSession(req.session);
  if (!userSession.isAuthorized()) {
    res.status(401).end('Please login first');
    return; 
  }  
  var params = req.query.projectHref.split('/');
  var projectId = params[params.length - 1];
  var containerId = bimDatabase.getCostContainerId(projectId) 
  console.log("project id:" + projectId);
  console.log("cost container id:" + containerId);

  if(!containerId){  
      console.log('failed to find ContainerId');
      res.status(500).end();
      return; 
  }  

  var input = {
    credentials:userSession.getUserServerCredentials(),  
    containerId:containerId
   };   

   try{
    var response = await costRead.getContracts(input );
    console.log(response)
    res.status(200).json(JSON.stringify(response.body.results)); 
   }catch( err ){
    console.log('get exception while fetching budgets')
    res.status(500).end(err.statusMessage);  
   }
})

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
router.get('/cost/costitem',jsonParser, async function (req, res) {
  
  var userSession = new UserSession(req.session);
  if (!userSession.isAuthorized()) {
    res.status(401).end('Please login first');
    return; 
  }  
  var params = req.query.projectHref.split('/');
  var projectId = params[params.length - 1];
  var containerId = bimDatabase.getCostContainerId(projectId) 
  console.log("project id:" + projectId);
  console.log("cost container id:" + containerId);

  if(!containerId){  
      console.log('failed to find ContainerId');
      res.status(500).end();
      return; 
  }  

  var input = {
    credentials:userSession.getUserServerCredentials(),  
    containerId:containerId
   };
   
   console.log(input);

   try{
    var response = await costRead.getCostItems(input );
    console.log(response)
    res.status(200).json(JSON.stringify(response.body.results)); 
   }catch( err ){
    console.log('get exception while fetching cost items')
    res.status(500).end(err.statusMessage);  
   }
})

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
router.get('/cost/changeorder',jsonParser, async function (req, res) {
  var userSession = new UserSession(req.session);
  if (!userSession.isAuthorized()) {
    console.log('failed to get access token');
    res.status(401).end('Please login first');
    return;
  }  
  var params = req.query.projectHref.split('/');
  var projectId = params[params.length - 1];
  var containerId = bimDatabase.getCostContainerId(projectId);
  var orderType = req.query.orderType; 
  if(!containerId){  
      console.log('failed to find ContainerId');
      res.status(500).end();
      return; 
  }  

  var input = {
    credentials:userSession.getUserServerCredentials(),  
    containerId:containerId,
    orderType:orderType
   };   

   try{
    var response = await costRead.getChangeOrders(input );
    res.status(200).json(JSON.stringify(response.body.results)); 
   }catch( err ){
    console.log('get exception while fetching budgets')
    res.status(500).end(err.statusMessage);  
   }
   return;
})

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
/// get status 
/////////////////////////////////////////////////////////////////////////////////////////////
router.get('/cost/statuses',jsonParser, async function (req, res) {
  
  if( costStatuses !== null ){
    res.status(200).json(JSON.stringify(costStatuses)); 
    return;
  }
  var userSession = new UserSession(req.session);
  if (!userSession.isAuthorized()) {
    res.status(401).end('Please login first');
    return; 
  }  
  var params = req.query.projectHref.split('/');
  var projectId = params[params.length - 1];
  var containerId = bimDatabase.getCostContainerId(projectId);
  console.log("project id:" + projectId);
  console.log("cost container id:" + containerId);

  if(!containerId){  
      console.log('failed to find ContainerId');
      res.status(500).end();
      return; 
  }  

  var input = {
    credentials:userSession.getUserServerCredentials(),  
    containerId:containerId
   };   

   console.log(input);

   try{
    var response = await costRead.getCostStatuses(input );
    console.log(response)
    costStatuses = response.body;
    res.status(200).json(JSON.stringify(costStatuses)); 
   }catch( err ){
    console.log('get exception while fetching budgets')
    res.status(500).end(err.statusMessage);  
   }
})

/////////////////////////////////////////////////////////////////////////////////////////////
/// get read data for the input Id 
/////////////////////////////////////////////////////////////////////////////////////////////
router.get('/bim360/v1/type/:typeId/id/:valueId', jsonParser, async function(req, res){

  var userSession = new UserSession(req.session);
  if (!userSession.isAuthorized()) {
    res.status(401).end('Please login first');
    return; 
  }  

  if(twoLeggedToken == null )
      twoLeggedToken = await oAuthServices.getAdminTwoLeggedToken();

  const typeId = req.params.typeId;
  const valueId = req.params.valueId.split(' ').join('');

  var options = null;

  switch (typeId) {
    case 'companyId': {
      const params = req.query.projectHref.split('/');
      const projectId = params[params.length - 1];
      const pureProjectId = projectId.split('b.').join('');
      options = {
        url: config.accountv1.getCompaniesUrl(config.accountv1.accountId, pureProjectId),
        headers: config.accountv1.httpHeaders(twoLeggedToken.credentials.access_token)
      };   
      break;
    }
    case 'creatorId':
    case 'changedBy':
    case 'contactId':
    case 'signedBy':
    case 'recipients':
    case 'ownerId': {
      options = {
        url: config.accountv1.userUrl(config.accountv1.accountId, valueId),
        headers: config.accountv1.httpHeaders(twoLeggedToken.credentials.access_token)
      };
      break;
    }


    // case 'budgetCodeId': {
    //   // TBD: not the correct way to get Budget Code
    //   var params = req.query.projectHref.split('/');
    //   var projectId = params[params.length - 1];
    //   var containerId = bimDatabase.getCostContainerId(projectId);
    
    //   if(!containerId){  
    //       console.log('failed to find ContainerId');
    //       res.status(500).end();
    //       return; 
    //   }  
    
    //   options = {
    //     url: config.costv1.getBudgetCodeUrl(containerId, valueId),
    //     headers: config.accountv1.httpHeaders(userSession.getUserServerCredentials().access_token)
    //   };  
    //   break;
    // }


    // // will use status code, and status id will be deprecated
    // case 'revenueStatusId': {
    //   // TBD: need a better way to get the status
    //   var params = req.query.projectHref.split('/');
    //   var projectId = params[params.length - 1];
    //   var containerId = bimDatabase.getCostContainerId(projectId);
    
    //   if(!containerId){  
    //       console.log('failed to find ContainerId');
    //       res.status(500).end();
    //       return; 
    //   }  
    
    //   options = {
    //     url: config.costv1.getBudgetCodeUrl(containerId, valueId),
    //     headers: config.accountv1.httpHeaders(userSession.getUserServerCredentials().access_token)
    //   };  
    //   break;
    // }

    case 'contractId': {
      var params = req.query.projectHref.split('/');
      var projectId = params[params.length - 1];
      var containerId = bimDatabase.getCostContainerId(projectId);
    
      if(!containerId){  
          console.log('failed to find ContainerId');
          res.status(500).end();
          return; 
      }  
    
      options = {
        url: config.costv1.contractUrl(containerId, valueId),
        headers: config.accountv1.httpHeaders(userSession.getUserServerCredentials().access_token)
      };  
      break;
    }

    case 'parentId': 
    case 'rootId':
    case 'budgets':
    case 'budgetId':{
      var params = req.query.projectHref.split('/');
      var projectId = params[params.length - 1];
      var containerId = bimDatabase.getCostContainerId(projectId);
      if(!containerId){  
          console.log('failed to find ContainerId');
          res.status(500).end();
          return; 
      }  
    
      options = {
        url: config.costv1.budgetUrl(containerId, valueId),
        headers: config.accountv1.httpHeaders(userSession.getUserServerCredentials().access_token)
      };  
      break;
    }
  }
  try {
    var response = await costRead.getIdValue(options);
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

module.exports = router