'use strict';

var
  _ = require('lodash'),
  $ = require('jquery');

/**
 * Controller used for the Service panel. It directly modifies the interface
 *
 * @param {Port} pageConnection - direct connection to the background script
 * @constructor
 */
function ServicePanelController (pageConnection, registry){

  var
    self = this,

    _newModuleNameInput = $('#module-name'),
    _newModuleServices = $('#module-services'),
    _addedModules = [];

  // We want to check if the module name is correct only when the user has finished typing.
  // We consider this to be when he has stopped for more than 300ms.
  _newModuleNameInput.keyup(_.debounce(function(){
    sendTaskToInspector({
      task: 'checkModuleName',
      moduleName: _newModuleNameInput.val()
    });
  }, 300));

  $('#addModuleModalApplyButton').click(function(){
    self.addModulePanel(_newModuleNameInput.val());
    sendTaskToInspector({
      task: 'instrumentModuleServices',
      moduleName: _newModuleNameInput.val()
    });
    $('#addModuleModal').modal('hide');
  });

  /**
   * Prints into the modal if the module name is correct or not. Along with that, it also prints
   * the list of services that are required by that module.
   *
   * @param {String}   moduleName - Module name that was checked by the inspector
   * @param {String[]} [services] - list of services defined by the module. If undefined, it means
   *                                that the module does not exist.
   */
  self.printModuleNameCheck = function(moduleName, services){

    var parent = _newModuleNameInput.parent();

    // We want to check that the user has not changed the name in the input since the check task
    // was sent to the inspector
    if (services && moduleName === _newModuleNameInput.val()){
      parent.removeClass('has-error');
      $('#addModuleModalApplyButton').removeAttr('disabled');
      parent.addClass('has-success');

      _newModuleServices.empty();

      var ul = $('<ul></ul>');
      _.forEach(services.sort(), function(service){
        ul.append('<li>' + service + '</li>');
      });

      _newModuleServices.append(ul);
    } else {
      parent.removeClass('has-success');
      parent.addClass('has-error');
      $('#addModuleModalApplyButton').attr('disabled', true);
      _newModuleServices
        .empty()
        .append('<p>The Module name is incorrect</p>');
    }
  };

  /**
   * Adds a panel to the Module instrumentation panel
   *
   * @param {String} moduleName - name of the module to instrument
   */
  self.addModulePanel = function(moduleName){
    $('#detailTimingTab').append('' +
      '<div id="panelFor' + moduleName + '" style="margin-top: 20px" class="row">' +
        '<div class="col-lg-12">' +
          '<div class="panel panel-default">'+
            '<div class="panel-heading">'+
              '<b> Module:  </b>' + moduleName +
              '<div class="btn-group pull-right" role="group" aria-label="...">'+
                '<button type="button" class="btn btn-danger btn-xs removeModuleInstrumentationButton">' +
                  '<span class="glyphicon glyphicon-minus"></span>' +
                '</button>'+
              '</div>'+
            '</div>'+

            '<div class="panel-body">'+

            '</div>'+
          '</div>' +
        '</div>' +
      '</div>');

    _addedModules.push(moduleName);

    var panel = $('#panelFor' + moduleName);

    panel.find('.removeModuleInstrumentationButton').click(function(){
      panel.remove();
      _.remove(_addedModules, function(value){
        return value === moduleName;
      });
    });
  };

  /**
   * Refreshes the tables for all the modules at most every 500 ms
   */
  self.refreshModulePanels = _.throttle(function(){

    var table, panelBody;

    _.forEach(_addedModules, function(module){

      panelBody = $('#panelFor' + module).find('.panel-body');

      panelBody.empty();

      // TODO Can be included in the addModule Function for more efficiency
      table = $('' +
        '<div class="table-responsive">' +
          '<table class="table table-bordered table-hover table-striped">' +
            '<thead>' +
              '<tr>' +
                '<th>Service</th>' +
                '<th>Function</th>' +
                '<th>Sync Execution Time (ms)</th>' +
                '<th>ASync Execution Time (ms) </th>' +
                '<th>Execution Count </th>' +
                '<th>Impact Score</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
            '</tbody>' +
          '</table>' +
        '</div>');

      _.forEach(registry.getModuleFunctionsExecutionData(module), function(execData){
        table.find('tbody').append('' +
          '<tr>' +
            '<td>' + execData.service + '</td>' +
            '<td>' + execData.func + '</td>' +
            '<td>' + execData.syncExecTime + '</td>' +
            '<td>' + execData.asyncExecTime + '</td>' +
            '<td>' + execData.count + '</td>' +
            '<td>' + execData.impactScore + '</td>' +
          '</tr>');
      });

      panelBody.append(table);
    });
  }, 500);

  // ------------------------------------------------------------------------------------------
  //                                    Private Functions
  // ------------------------------------------------------------------------------------------

  /**
   * @private
   * Sends a task to the inspector through the background page message dispatcher
   *
   * @param {Object} task      - task to be executed by the Inspector.
   * @param {String} task.task - This is the string that reference the task to be done
   */
  function sendTaskToInspector(task){
    pageConnection.postMessage({
      task: 'sendTaskToInspector',
      tabId: chrome.devtools.inspectedWindow.tabId,
      data: task
    });
  }
}

module.exports = ServicePanelController;