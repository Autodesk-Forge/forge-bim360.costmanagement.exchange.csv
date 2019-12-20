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


// Define method String.replaceAll 
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
  };
}


$(document).ready(function () {

  // Trigger the message for import operation
  $('input:radio[name="exportOrImport"]').click(function () {
    var checkValue = $('input:radio[name="exportOrImport"]:checked').val();
    if (checkValue === 'import') {
      $('#importParameters').show();

    } else {
      $('#importParameters').hide();
    }
  });

  $('#executeCSV').click(function () {
    exporting = $('input[name="exportOrImport"]:checked').val() === 'export';
    // Export the current table
    if (exporting) {
      if (csvInfo.Data === null) {
        alert('Please get the data first.')
        return;
      }
      exportCSV(csvInfo);
    } else {
      // Import data from selected CSV file
      var fileUpload = document.getElementById("inputFile");
      var regex = /^([a-zA-Z0-9\s_\\.\-:\(\)])+(.csv|.txt)$/;
      if (regex.test(fileUpload.value.toLowerCase())) {
        if (typeof (FileReader) != "undefined") {
          var reader = new FileReader();
          reader.onload = async function (e) {

            const projectHref = $('#labelProjectHref').text();
            const costContainerId = $('#labelCostContainer').text();
            if (projectHref === '' || costContainerId === '' ) {
              alert('please select one project!');
              return;
            }
            $('#loader_stats').css({ display: "block" });
            var rows = e.target.result.split("\n");
            const keys = rows[0].split(',');

            for (var i = 1; i < rows.length; i++) {
              var jsonData = {};
              var cells = rows[i].split(",");
              if (cells.length > 1) {
                for (var j = 0; j < cells.length; j++) {
                  const typeSupported = isTypeSupported(keys[j]);
                  if (typeSupported === TypeSupported.STRING) {
                    jsonData[keys[j]] = cells[j];
                  }
                  if (typeSupported === TypeSupported.NUMBER) {
                    jsonData[keys[j]] = parseFloat(cells[j]);
                    // jsonData[keys[j]] = parseInt(cells[j]);
                  }
                  if (typeSupported === TypeSupported.CUSTOM_ATTRIBUTE) {
                    const params = keys[j].split(':');
                    try {
                      // interesting, it always add '\r' at the end of the string, workaround for now.
                      await updateCustomAttribute(projectHref, costContainerId, jsonData['id'], params[params.length - 1].split('\r').join(''), cells[j].split('\r').join(''));
                    } catch (err) {
                      console.log('Failed to update custom attribute ' + params[params.length - 2] + ' : ' + cells[j]);
                    }
                  }
                }
              }
              // Trigger the Post request
              console.log(jsonData);
              try {
                await updateRowInfo2(projectHref, costContainerId, jsonData);
              } catch (err) {
                console.log(err);
              }
            }
            $('#loader_stats').css({ display: "none" });
            $('#btnRefresh').click();
          }
          reader.readAsText(fileUpload.files[0]);
        } else {
          alert("This browser does not support HTML5.");
        }
      } else {
        alert("Please upload a valid CSV file.");
      }
    }
  });


  $('#btnRefresh').click(async () => {
    const projectHref = $('#labelProjectHref').text();
    const costContainerId = $('#labelCostContainer').text();
    if (projectHref === '') {
      alert('please select one project!');
      return;
    }

    const displayStyle = $('input[name="dataTypeToDisplay"]:checked').val() === 'beautifulData';

    $('#loader_stats').css({ display: "block" });
    switch (csvInfo.ActiveTab) {
      case '#budget': {
        await refreshBudgets(projectHref, costContainerId, displayStyle);
        break;
      }
      case '#contract': {
        await refreshContracts(projectHref,costContainerId, displayStyle);
        break;
      }
      case '#costitem': {
        await refreshCostitems(projectHref, costContainerId, displayStyle);
        break;
      }
      case '#changeorder': {
        await refreshChangeOrders(projectHref, costContainerId, displayStyle);
        break;
      }
    }
    $('#loader_stats').css({ display: "none" });
  })

  $("input[name='order_type']").click(function () {
    $('#btnRefresh').click();
  })

  $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    var activeTab = e.target.hash;
    csvInfo.ActiveTab = activeTab;
    $('#btnRefresh').click();
  });
});






const SupportedStringTypes = [
  'name',
  'description',
  'id',
  'contactId'
]


const SupportedNumberTypes = [
  'unitPrice',
  'quantity',
]


const TypeSupported = {
  NUMBER: 0,
  STRING: 1,
  CUSTOM_ATTRIBUTE: 2,
  NOT_SUPPORTED: 9
}

var csvInfo = {
  Data: null,
  FileName: 'default',
  ActiveTab: '#budget'
}


var cachedInfo = {
  DataInfo: []
}

function isTypeSupported(typeName) {

  for (var type in SupportedNumberTypes) {
    if (typeName === SupportedNumberTypes[type])
      return TypeSupported.NUMBER;
  }

  for (var type in SupportedStringTypes) {
    if (typeName === SupportedStringTypes[type])
      return TypeSupported.STRING;
  }


  const params = typeName.split(':');
  if (params[0] === 'CA')
    return TypeSupported.CUSTOM_ATTRIBUTE;

  return TypeSupported.NOT_SUPPORTED;
}


function updateCustomAttribute(projectHref, costContainerId, entityId, attributeId, attributeValue) {
  let def = $.Deferred();

  let associationType = null;
  switch (csvInfo.ActiveTab) {
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

  const requestData = {
    'projectHref': projectHref,    
    'costContainerId': costContainerId,
    'requestData': [{
      'associationType': associationType,
      'associationId': entityId,
      'propertyDefinitionId': attributeId,
      'value': attributeValue
    }]
  };

  jQuery.post({
    url: '/api/forge/cost/attribute',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify(requestData),

    success: function (res) {
      def.resolve(res);
    },

    error: function (err) {
      console.log('update custom attribute failed');
      def.reject(err)
    }
  });

  return def.promise();
}




function updateRowInfo2(projectHref, costContainerId, requestData) {
  let def = $.Deferred();

  const requestUrl = '/api/forge/cost/info';
  const order_Type = $('input[name="order_type"]:checked ').val();

  const requestBody = {
    'projectHref': projectHref,
    'costContainerId': costContainerId,
    'costType': csvInfo.ActiveTab,
    'requestData': requestData,
    'orderType': order_Type
  };

  // await updateData(requestUrl, requetData);

  jQuery.post({
    url: requestUrl,
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify(requestBody),

    success: function (res) {
      def.resolve(res);
    },

    error: function (err) {
      console.log('update data failed:');
      def.reject(err)
    }
  });

  return def.promise();

}




async function refreshBudgets(projectHref, costContainerId, beautify = false) {
  csvInfo.Data = null;
  try {
    const budgets = await refreshBudgetDashboard(projectHref, costContainerId, true);
    // var budgets = JSON.parse(res);
    let resultData = await extendCustomAttr(budgets, projectHref);
    resultData = await removeNonsenseColumns(resultData);
    if (beautify) {
      resultData = beautifyTitles(resultData);
      resultData = await beautifyData(resultData, projectHref,costContainerId);
      resultData = await beautifyColumns(resultData);
    }
    await createTable("#budgetsTable", resultData, projectHref);
    csvInfo.Data = await prepareCSVData(resultData);
    csvInfo.FileName = 'BudgetInfo';
  } catch (err) {
    console.log(err);
  }
};


async function refreshContracts(projectHref, costContainerId, beautify = false) {
  csvInfo.Data = null;
  try {
    const contracts = await refreshContractDashboard(projectHref, costContainerId, true);
    // var contracts = JSON.parse(res);
    let resultData = await extendCustomAttr(contracts, projectHref);
    resultData = await removeNonsenseColumns(resultData);
    if (beautify) {
      resultData = beautifyTitles(resultData);
      resultData = await beautifyData(resultData, projectHref);
      resultData = await beautifyColumns(resultData);
    }
    await createTable("#contractsTable", resultData, projectHref);
    csvInfo.Data = await prepareCSVData(resultData);
    csvInfo.FileName = 'ContractInfo';
  } catch (err) {
    console.log(err);
  }
};


async function refreshCostitems(projectHref, costContainerId, beautify = false) {
  csvInfo.Data = null;
  try {
    const costItems = await refreshCostItemDashboard(projectHref, costContainerId, true);
    // var costItems = JSON.parse(res);
    let resultData = await extendCustomAttr(costItems, projectHref);
    resultData = await removeNonsenseColumns(resultData);
    if (beautify) {
      resultData = beautifyTitles(resultData);
      resultData = await beautifyData(resultData, projectHref);
      resultData = await beautifyColumns(resultData);
    }
    await createTable("#costItemsTable", resultData, projectHref);
    csvInfo.Data = await prepareCSVData(resultData);
    csvInfo.FileName = 'CostItemInfo';
  } catch (err) {
    console.log(err);
  }
};


async function refreshChangeOrders(projectHref, costContainerId, beautify = false) {
  csvInfo.Data = null;
  const order_Type = $('input[name="order_type"]:checked ').val();
  try {
    const orders = await refreshChangeOrderDashboard(projectHref, costContainerId, order_Type, true);
    // var orders = JSON.parse(res);
    let resultData = await extendCustomAttr(orders, projectHref);
    resultData = await removeNonsenseColumns(resultData);
    if (beautify) {
      resultData = beautifyTitles(resultData);
      resultData = await beautifyData(resultData, projectHref);
      resultData = await beautifyColumns(resultData);
    }

    await createTable("#changeOrderTable", resultData, projectHref);
    csvInfo.Data = await prepareCSVData(resultData);
    csvInfo.FileName = 'ChangeOrderInfo_' + order_Type;
  } catch (err) {
    console.log(err);
  }
};


async function createTable(tableId, tableVals, projectHref) {

  // create the head for the table
  let columns = [];
  for (var key in tableVals[0]) {
    columns.push({
      field: key,
      title: key,
      align: "center"
    })
  }

  $(tableId).bootstrapTable('destroy');

  $(tableId).bootstrapTable({
    data: tableVals,
    editable: true,
    clickToSelect: true,
    cache: false,
    showToggle: false,
    showPaginationSwitch: true,
    pagination: true,
    pageList: [10, 25, 50, 100],
    pageSize: 15,
    pageNumber: 1,
    uniqueId: 'id',
    striped: true,
    search: true,
    showRefresh: true,
    minimumCountColumns: 2,
    smartDisplay: true,
    columns: columns
  });
};






async function extendCustomAttr(tableVals, projectHref ) {
  for (var key in tableVals[0]) {
    if (Array.isArray(tableVals[0][key])) {
      tableVals.forEach((rowData, index) => {
        switch (key) {
          // // TBD: Remove this case when it's fixed. IMP-4530
          // case 'propertyValues':
          //   // let propertyValueText = '';
          //   // const propertyValueCount = rowData[key].length;
          //   // for (let i = 0; i < propertyValueCount; ++i) {
          //   //   propertyValueText += rowData[key][i].id;
          //   //   propertyValueText += ' : ';
          //   //   propertyValueText += rowData[key][i].value;
          //   //   propertyValueText += ';  ';
          //   // }
          //   rowData[key] = '';
          //   break;
          case 'recipients':
            let recipientsText = '';
            if (rowData[key] !== null) {
              const recipientCount = rowData[key].length;
              for (let i = 0; i < recipientCount; ++i) {
                recipientsText += rowData[key][i].id;
                recipientsText += ';  ';
              }
              rowData[key] = recipientsText;
            }
            break;

          // make all the custom attributes as new column.
          case 'properties':
            const propertyCount = rowData[key].length;
            for (let i = 0; i < propertyCount; ++i) {
              let customPropertyKey = '';
              // only show the property definition id in raw mode
              customPropertyKey = 'CA:' + rowData[key][i].name + ':' + rowData[key][i].propertyDefinitionId;
              let propertyValue = rowData[key][i].value;
              rowData[customPropertyKey] = propertyValue ? propertyValue.replaceAll('\n', ';') : propertyValue;
            }
            rowData[key] = '';
            break;

          // "budgets" properties when include formInstances in GET Contracts
          case 'budgets':
            let budgetsText = '';
            const budgetCount = rowData[key].length;
            for (let i = 0; i < budgetCount; ++i) {
              budgetsText += rowData[key][i].id;
              budgetsText += ';  ';
            }
            rowData[key] = budgetsText;
            break;

          // "formInstances" properties when include formInstances in GET Cost Items
          case 'formInstances':
            let formInstancesText = '';
            const formInstanceCount = rowData[key].length;
            for (let i = 0; i < formInstanceCount; ++i) {
              formInstancesText += rowData[key][i].formDefinition.name;
              formInstancesText += ' : ';
              formInstancesText += rowData[key][i].name;
              formInstancesText += ';  ';
            }
            rowData[key] = formInstancesText;
            break;

          // "costItems" properties when include costItems in GET Change Orders
          case 'costItems':
            let costItemsText = '';
            const costItemCount = rowData[key].length;
            for (let i = 0; i < costItemCount; ++i) {
              costItemsText += rowData[key][i].name;
              costItemsText += ';  ';
            }
            rowData[key] = costItemsText;
            break;


          default:
            rowData[key] = "...";
            break;
        };
      })
    }
  }
  return tableVals;
};


async function removeNonsenseColumns(inputTable) {
  await removeColumns(inputTable, 'scopeOfWork');
  // await removeColumns(inputTable, 'contract');
  await removeColumns(inputTable, 'adjustments');

  // the following id will be removed, will use status code instead.
  await removeColumns(inputTable, 'statusId');
  await removeColumns(inputTable, 'budgetStatusId');
  await removeColumns(inputTable, 'costStatusId');
  await removeColumns(inputTable, 'formDefinitionId');

  // will be removed
  await removeColumns(inputTable, 'templateId');

  // This is duplicated information, and will be removed with paramter "include"
  await removeColumns(inputTable, 'budget');

  return inputTable;
}


async function beautifyColumns( inputTable ){
  await removeColumns(inputTable, 'id');
  await removeColumns(inputTable, 'containerId');

  return inputTable;
}


function beautifyTitles( tableVals ){
  // remove the GUID for custom attribute
  for (var key in tableVals[0]) {
    const params = key.split(':');
    if(params[0] === 'CA'){
      var newKey = params[0] + ':' + params[1];
      tableVals.forEach( (row)=>{
        row[newKey] = row[key];
        delete row[key];
      } )
    }
  }
  return tableVals;
}


async function beautifyData(tableVals, projectHref, containerId) {
  // await updateTableContent( 'budgetCodeId', tableVals, projectHref );
  await updateTableContent('creatorId', tableVals, projectHref, containerId);
  await updateTableContent('changedBy', tableVals, projectHref,containerId);
  await updateTableContent('ownerId', tableVals, projectHref,containerId);
  await updateTableContent('contactId', tableVals, projectHref,containerId);
  await updateTableContent('signedBy', tableVals, projectHref,containerId);

  await updateTableContent('parentId', tableVals, projectHref,containerId);
  await updateTableContent('rootId', tableVals, projectHref,containerId);
  await updateTableContent('budgetId', tableVals, projectHref,containerId);

  await updateTableContent('contractId', tableVals, projectHref,containerId);

  await updateTableContent('recipients', tableVals);

  await updateTableContent('budgets', tableVals, projectHref,containerId);



  await updateTableContent('companyId', tableVals, projectHref,containerId);

  // await updateTableContent( 'revenueStatusId', tableVals, projectHref );
  // await updateTableContent( 'costStatusId', tableVals, projectHref );
  // await updateTableContent( 'formDefinitionId', tableVals, projectHref );

  return tableVals;
};


async function prepareCSVData(tableVals) {

  let csvRows = [];
  let csvHeader = [];

  // Set the header of CSV
  for (var key in tableVals[0]) {
    csvHeader.push(key);
  }
  csvRows.push(csvHeader);

  // Set the row data of CSV
  tableVals.forEach((rowData, index) => {
    let csvRowTmp = [];
    for (key in rowData) {
      // console.log(rowData[key])
      csvRowTmp.push(rowData[key]);
    }
    csvRows.push(csvRowTmp);
  })
  return csvRows;
};




async function removeColumns(tableVals, columnName) {
  tableVals.forEach((rowData, index) => {
    if( typeof rowData[columnName] !== 'undefined'){
      rowData[columnName] = '';
    }
  })
}


async function updateTableContent(rawId, tableVals, projectHref=null, containerId=null) {

  /// get the real data from the Id
  // const idIndex = tableVals[0][rawId];
  const count = tableVals.length;
  for (i = 0; i < count; ++i) {
    if (rawId == null || tableVals[i][rawId] == null)
      continue;


    let idArray = tableVals[i][rawId].split(';');
    let textArray = [];

    await Promise.all(
      idArray.map(async (id) => {
        const idWithoutSpace = id.split(' ').join('');
        if( idWithoutSpace === '' )
          return;
        // Check if it's cached
        let dataCached = false;
        const cacheCount = cachedInfo.DataInfo.length;
        for (j = 0; j < cacheCount; ++j) {
          if (cachedInfo.DataInfo[j].Id === idWithoutSpace) {
            // tableVals[i][rawId] = cachedInfo.DataInfo[j].Value;
            textArray.push(cachedInfo.DataInfo[j].Value);
            dataCached = true;
            break;
          }
        }

        if (!dataCached) {
          try {
            const realValue = await getContentFromId(rawId, idWithoutSpace, projectHref, containerId);
            cachedInfo.DataInfo.push({ Id: idWithoutSpace, Value: realValue })
            textArray.push(realValue);
          }
          catch (err) {
            console.log("Failed to get data " + idWithoutSpace + " for " + rawId);
          }
        }
      })
    )

    tableVals[i][rawId] = textArray[0];
    for (let k = 1; k < textArray.length; k++) {
      tableVals[i][rawId] = tableVals[i][rawId] + ';' + textArray[k];
    }    
  }
}



function getContentFromId(rawId, rawValue, projectHref=null, costContainerId=null) {
  let def = $.Deferred();

  if (rawId == null || rawValue == null) {
    console.log('input is not valid.');
    def.reject('input is not valid.');
    return def.promise();
  }

  jQuery.get({
    url: '/api/forge/bim360/v1/type/' + encodeURIComponent(rawId) + '/id/' + encodeURIComponent(rawValue),
    dataType: 'json',
    data: {
      'projectHref': projectHref,
      'costContainerId': costContainerId
    },
    success: function (res) {
      def.resolve(JSON.parse(res).name);
    },
    error: function (err) {
      def.reject(err);
    }
  });

  return def.promise();
}




function getData(requestUrl, requestData) {
  let def = $.Deferred();

  jQuery.ajax({
    url: requestUrl,
    contentType: 'application/json',
    type: 'GET',
    dataType: 'json',
    data: requestData,
    success: function (res) {
      def.resolve(res);
    },
    error: function (err) {
      console.log('get cost info failed:');
      def.reject(err)
    }
  });
  return def.promise();
}


async function refreshBudgetDashboard(projectHref, costContainerId, isRefresh = true) {

  const requestUrl = '/api/forge/cost/info';
  const requetData = {
    'projectHref': projectHref,
    'costContainerId': costContainerId,
    'isRefresh': isRefresh,
    'costType': 'budgets'
  };

  return await getData(requestUrl, requetData);
}


async function refreshContractDashboard(projectHref, costContainerId, isRefresh = true) {

  const requestUrl = '/api/forge/cost/info';
  const requetData = {
    'projectHref': projectHref,
    'costContainerId': costContainerId,
    'isRefresh': isRefresh,
    'costType': 'contracts'
  };

  return await getData(requestUrl, requetData);
}

async function refreshCostItemDashboard(projectHref, costContainerId, isRefresh = true) {

  const requestUrl = '/api/forge/cost/info';
  const requetData = {
    'projectHref': projectHref,
    'costContainerId': costContainerId,
    'isRefresh': isRefresh,
    'costType': 'costitems'

  };

  return await getData(requestUrl, requetData);
}


async function refreshChangeOrderDashboard(projectHref, costContainerId, order_Type, isRefresh = true) {

  const requestUrl = '/api/forge/cost/info';
  const requetData = {
    'projectHref': projectHref,
    'costContainerId': costContainerId,
    'orderType': order_Type,
    'isRefresh': isRefresh,
    'costType': 'changeorders'
  };

  return await getData(requestUrl, requetData);
}




function exportCSV(csvInfo) {

  var csvString = csvInfo.Data.join("%0A");
  var a = document.createElement('a');
  a.href = 'data:attachment/csv,' + csvString;
  a.target = '_blank';
  a.download = csvInfo.FileName + '.csv';
  document.body.appendChild(a);
  a.click();
}


