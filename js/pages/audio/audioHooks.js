// Function that querys all of the data we need.
$(run = function() {
    // Check if the module is enabled.
    socket.getDBValue('audio_module', 'modules', './systems/audioPanelSystem.js', function(e) {
        // If the module is off, don't load any data.
        if (!helpers.getModuleStatus('audioHookModule', e.modules)) {
            // Disable the tab selection.
            $('#audiohooks_t, #audiocommands_t').addClass('disabled').parent().addClass('disabled');
            return;
        } else {
            // Enable the tab selection.
            $('#audiohooks_t, #audiocommands_t').removeClass('disabled').parent().removeClass('disabled');
        }

        // Get all audio hooks.
        socket.getDBTableValues('get_audio_hooks', 'audio_hooks', function(results) {
            let tableData = [];

            for (let i = 0; i < results.length; i++) {
                tableData.push([
                    results[i].key,
                    $('<div/>', {
                        'class': 'btn-group'
                    }).append($('<button/>', {
                        'type': 'button',
                        'class': 'btn btn-xs btn-danger',
                        'style': 'float: right',
                        'data-audio': results[i].key,
                        'html': $('<i/>', {
                            'class': 'fa fa-trash'
                        })
                    })).append($('<button/>', {
                        'type': 'button',
                        'class': 'btn btn-xs btn-success',
                        'style': 'float: right',
                        'data-toggle': 'tooltip',
                        'title': 'This plays the audio hooks through the panel and not the browser source.',
                        'data-audio': results[i].value,
                        'html': $('<i/>', {
                            'class': 'fa fa-play'
                        })
                    })).html()
                ]);
            }

            // if the table exists, destroy it.
            if ($.fn.DataTable.isDataTable('#audioHooksTable')) {
                $('#audioHooksTable').DataTable().destroy();
                // Remove all of the old events.
                $('#audioHooksTable').off();
            }

            // Create table.
            let table = $('#audioHooksTable').DataTable({
                'searching': true,
                'autoWidth': false,
                'lengthChange': false,
                'data': tableData,
                'columnDefs': [
                    { 'className': 'default-table', 'orderable': false, 'targets': 1 }
                ],
                'columns': [
                    { 'title': 'Audio Hook' },
                    { 'title': 'Actions' }
                ]
            });

            // On play button.
            table.on('click', '.btn-success', function() {
                let audioHook = $(this).data('audio'),
                    soundPath = '/config/audio-hooks/';

                // Load the audio.
                let audio = new Audio(soundPath + audioHook);
                // Set the volume.
                audio.volume = '0.8';
                // Add event handler.
                $(audio).on('ended', function() {
                    audio.currentTime = 0;
                });

                // Play it!
                audio.play();
            });

            // On delete button.
            table.on('click', '.btn-danger', function() {
                let audioHookName = $(this).data('audio'),
                    row = $(this).parents('tr');

                // Ask the user if he wants to delete the audio hook.
                helpers.getConfirmDeleteModal('audio_modal_remove', 'Are you sure you want to remove the audio hook "' + audioHookName + '"?', true,
                    'The audio hook "' + audioHookName + '" has been successfully removed!', function() { // Callback if the user clicks delete.
                    socket.sendCommand('audio_hook_rm_cmd', 'panelremoveaudiohook ' + audioHookName, function() {
                        // Remove the table row.
                        table.row(row).remove().draw(false);
                    });
                });
            });
        });

        // Get audio commands.
        socket.getDBTableValues('audio_hooks_get_cmds', 'audioCommands', function(results) {
            let tableData = [];

            for (let i = 0; i < results.length; i++) {
                tableData.push([
                    '!' + results[i].key,
                    results[i].value,
                    $('<div/>', {
                        'class': 'btn-group'
                    }).append($('<button/>', {
                        'type': 'button',
                        'class': 'btn btn-xs btn-danger',
                        'style': 'float: right',
                        'data-command': results[i].key,
                        'html': $('<i/>', {
                            'class': 'fa fa-trash'
                        })
                    })).append($('<button/>', {
                        'type': 'button',
                        'class': 'btn btn-xs btn-warning',
                        'style': 'float: right',
                        'data-command': results[i].key,
                        'html': $('<i/>', {
                            'class': 'fa fa-edit'
                        })
                    })).html()
                ]);
            }

            // if the table exists, destroy it.
            if ($.fn.DataTable.isDataTable('#audioHookCommandsTable')) {
                $('#audioHookCommandsTable').DataTable().destroy();
                // Remove all of the old events.
                $('#audioHookCommandsTable').off();
            }

            // Create table.
            let table = $('#audioHookCommandsTable').DataTable({
                'searching': true,
                'autoWidth': false,
                'lengthChange': false,
                'data': tableData,
                'columnDefs': [
                    { 'className': 'default-table', 'orderable': false, 'targets': 2 },
                    { 'width': '45%', 'targets': 0 }
                ],
                'columns': [
                    { 'title': 'Command' },
                    { 'title': 'Audio Hook' },
                    { 'title': 'Actions' }
                ]
            });

            // On delete button.
            table.on('click', '.btn-danger', function() {
                let command = $(this).data('command'),
                    row = $(this).parents('tr');

                // Ask the user if he want to remove the command.
                helpers.getConfirmDeleteModal('rm_audio_command_cmd_modal', 'Are you sure you want to remove command !' + command + '?', true,
                    'The command !' + command + ' has been successfully removed!', function() {
                    socket.removeDBValue('rm_audio_command', 'audioCommands', command, function() {
                        socket.sendCommand('rm_audio_command_cmd', 'panelloadaudiohookcmds ' + command, function() {
                            // Remove the table row.
                            table.row(row).remove().draw(false);
                        });
                    });
                });
            });

            // On edit button.
            table.on('click', '.btn-warning', function() {
                let command = $(this).data('command'),
                    t = $(this);

                // Get all the info about the command.
                socket.getDBValues('audio_command_edit', {
                    tables: ['audioCommands', 'permcom', 'cooldown', 'pricecom'],
                    keys: [command, command, command, command, command]
                }, function(e) {
                    let cooldownJson = (e.cooldown === null ? { isGlobal: 'true', seconds: 0 } : JSON.parse(e.cooldown));

                    // Get advance modal from our util functions in /utils/helpers.js
                    helpers.getAdvanceModal('edit-audio-command', 'Edit Audio Command', 'Save', $('<form/>', {
                        'role': 'form'
                    })
                    // Append input box for the command name. This one is disabled.
                    .append(helpers.getInputGroup('command-name', 'text', 'Command', '', '!' + command, 'Name of the command. This cannot be edited.', true))
                    // Append input box for the command audio. This one is disabled.
                    .append(helpers.getInputGroup('command-audio', 'text', 'Audio Hook', '', e.audioCommands, 'Audio to be played. This cannot be edited.', true))
                    // Append a select option for the command permission.
                    .append(helpers.getDropdownGroup('command-permission', 'User Level', helpers.getGroupNameById(e.permcom),
                        ['Caster', 'Administrators', 'Moderators', 'Subscribers', 'Donators', 'Hosters', 'Regulars', 'Viewers']))
                    // Add an advance section that can be opened with a button toggle.
                    .append($('<div/>', {
                        'class': 'collapse',
                        'id': 'advance-collapse',
                        'html': $('<form/>', {
                                'role': 'form'
                            })
                            // Append input box for the command cost.
                            .append(helpers.getInputGroup('command-cost', 'number', 'Cost', '0', helpers.getDefaultIfNullOrUndefined(e.pricecom, '0'),
                                'Cost in points that will be taken from the user when running the command.'))
                            // Append input box for the command cooldown.
                            .append(helpers.getInputGroup('command-cooldown', 'number', 'Cooldown (Seconds)', '5', cooldownJson.seconds,
                                'Cooldown of the command in seconds.')
                                // Append checkbox for if the cooldown is global or per-user.
                                .append(helpers.getCheckBox('command-cooldown-global', cooldownJson.isGlobal === 'true', 'Global',
                                    'If checked the cooldown will be applied to everyone in the channel. When not checked, the cooldown is applied per-user.')))
                    })), function() {
                        let commandPermission = $('#command-permission'),
                            commandCost = $('#command-cost'),
                            commandCooldown = $('#command-cooldown'),
                            commandCooldownGlobal = $('#command-cooldown-global').is(':checked');

                        // Handle each input to make sure they have a value.
                        switch (false) {
                            case helpers.handleInputNumber(commandCost):
                            case helpers.handleInputNumber(commandCooldown):
                                break;
                            default:
                               // Save command information here and close the modal.
                                socket.updateDBValues('custom_command_edit', {
                                    tables: ['pricecom', 'permcom'],
                                    keys: [command, command],
                                    values: [commandCost.val(), helpers.getGroupIdByName(commandPermission.find(':selected').text(), true)]
                                }, function() {
                                    // Add the cooldown to the cache.
                                    socket.wsEvent('audio_command_edit_cooldown_ws', './core/commandCoolDown.js', null,
                                        ['add', command, commandCooldown.val(), String(commandCooldownGlobal)], function() {
                                        // Update command permission.
                                        socket.sendCommand('edit_command_permission_cmd', 'permcomsilent ' + command + ' ' +
                                            helpers.getGroupIdByName(commandPermission.find(':selected').text(), true), function() {
                                            // Close modal.
                                            $('#edit-audio-command').modal('toggle');
                                            // Alert the user.
                                            toastr.success('Successfully edit audio command!');
                                        });
                                    });
                                });
                        }
                    }).modal('toggle');
                });
            });
        });

        // Welcome the user to the new page.
        socket.getDBValue('get_audio_hook_warning', 'panelData', 'audioHookNewUser', function(e) {
            if (e.panelData !== 'true') {
                alert('Hi there! \nWelcome to PhantomBot\'s audio hook page! This page allows you to test, listen, and add audio commands. \n' +
                    'If you\'ve used the old panel before, audio hooks used to play on this page when a user ran an audio command. This is no longer a feature. ' +
                    'Now, all audio hooks are sent through PhantomBot\'s alert page which can be used as a browser source in OBS. \n' +
                    'Click the settings button to access the browser source URL.');
                socket.updateDBValue('audio_hook_warning_set', 'panelData', 'audioHookNewUser', 'true', new Function());
            }
        });
    });
});

// Function that handlers the loading of events.
$(function() {
    // Toggle for the module.
    $('#audioHookModuleToggle').on('change', function() {
        // Enable the module then query the data.
        socket.sendCommandSync('audio_module_toggle_cmd', 'module ' + ($(this).is(':checked') ? 'enablesilent' : 'disablesilent') + ' ./systems/audioPanelSystem.js', run);
    });

    // Reload audio hooks button.
    $('#reload-audio-hooks').on('click', function() {
        socket.sendCommandSync('reload_audio_hooks_cmd', 'reloadaudiopanelhooks', function() {
            // Load new audio hooks.
            run();
            // Alert the user.
            toastr.success('Successfully refreshed audio hooks!');
        });
    });

    // Audio hooks settings.
    $('#audio-hooks-settings').on('click', function() {
        // Create custom modal for this module.
        helpers.getModal('audio-settings', 'Audio Hook Settings', 'Ok', $('<form/>', {
            'role': 'form'
        })
        // Main div for the browser source link.
        .append($('<div/>', {
            'class': 'form-group',
        })
        // Append the lable.
        .append($('<label/>', {
            'text': 'Browser Source Link'
        }))
        .append($('<div/>', {
            'class': 'input-group'
        })
        // Add client widget URL.
        .append($('<input/>', {
            'type': 'text',
            'class': 'form-control',
            'id': 'audio-url',
            'readonly': 'readonly',
            'value': window.location.protocol + '//' + window.location.host + '/alerts?allow-audio-hooks=true&allow-alerts=false&audio-hook-volume=0.8',
            'style': 'color: transparent !important; text-shadow: 0 0 5px hsla(0, 0%, 100%, .5);',
            'data-toggle': 'tooltip',
            'title': 'Clicking this box will show the link.',
            'click': function() {
                // Reset styles.
                $(this).prop('style', '');
            }
        })).append($('<span/>', {
            'class': 'input-group-btn',
            'html': $('<button/>', {
                'type': 'button',
                'class': 'btn btn-primary btn-flat',
                'html': 'Copy',
                'click': function() {
                    // Select URL.
                    $('#audio-url').select();
                    // Copy the URL.
                    document.execCommand('Copy');
                }
            })
        })))), function() {
            // Close the modal.
            $('#audio-settings').modal('toggle');
        }).modal('toggle');
    });

    // Add audio command.
    $('#audio-hooks-cmd-add').on('click', function() {
        socket.getDBTableValues('get_all_audio_hooks', 'audio_hooks', function(results) {
            let audioNames = [];

            for (let i = 0; i < results.length; i++) {
                audioNames.push(results[i].key);
            }

            helpers.getAdvanceModal('add-audio-cmd', 'Add Audio Command', 'Save', $('<form/>', {
                'role': 'form'
            })
            // Append command name.
            .append(helpers.getInputGroup('command-name', 'text', 'Command', '!boo', '', 'Command that will trigger the audio hook.'))
            // All audio hooks in a list.
            .append(helpers.getDropdownGroup('command-audio', 'Audio Hook', 'Select an Audio Hook', audioNames, 'Audio hook to be played when the command is ran.'))
            // Append a select option for the command permission.
            .append(helpers.getDropdownGroup('command-permission', 'User Level', 'Viewers',
                ['Caster', 'Administrators', 'Moderators', 'Subscribers', 'Donators', 'Hosters', 'Regulars', 'Viewers'], 'Users who can run the command.'))
            // Add an advance section that can be opened with a button toggle.
            .append($('<div/>', {
                'class': 'collapse',
                'id': 'advance-collapse',
                'html': $('<form/>', {
                        'role': 'form'
                    })
                    // Append input box for the command cost.
                    .append(helpers.getInputGroup('command-cost', 'number', 'Cost', '0', '0',
                        'Cost in points that will be taken from the user when running the command.'))
                    // Append input box for the command cooldown.
                    .append(helpers.getInputGroup('command-cooldown', 'number', 'Cooldown (Seconds)', '0', '5',
                        'Cooldown of the command in seconds.')
                        // Append checkbox for if the cooldown is global or per-user.
                        .append(helpers.getCheckBox('command-cooldown-global', true, 'Global',
                            'If checked the cooldown will be applied to everyone in the channel. When not checked, the cooldown is applied per-user.')))
            })), function() {
                let commandName = $('#command-name'),
                    commandAudio = $('#command-audio'),
                    commandPermission = $('#command-permission'),
                    commandCost = $('#command-cost'),
                    commandCooldown = $('#command-cooldown'),
                    commandCooldownGlobal = $('#command-cooldown-global').is(':checked');

                // Remove the ! and spaces.
                commandName.val(commandName.val().replace(/(\!|\s)/g, '').toLowerCase());

                // Handle each input to make sure they have a value.
                switch (false) {
                    case helpers.handleInputString(commandName):
                    case helpers.handleInputNumber(commandCost):
                    case helpers.handleInputNumber(commandCooldown):
                        break;
                    default:
                        if (commandAudio.val() === null) {
                            toastr.error('Please select a valid audio hook to be played.');
                        } else {
                            // Make sure the command doesn't exist already.
                            socket.getDBValue('audio_command_exists', 'permcom', commandName.val(), function(e) {
                                // If the command exists we stop here.
                                if (e.permcom !== null) {
                                    toastr.error('Failed to add command as it already exists.');
                                    return;
                                }

                                // Add the command.
                                socket.updateDBValues('add_audio_command', {
                                    tables: ['pricecom', 'permcom', 'audioCommands'],
                                    keys: [commandName.val(), commandName.val(), commandName.val()],
                                    values: [commandCost.val(), helpers.getGroupIdByName(commandPermission.find(':selected').text()), commandAudio.val()]
                                }, function() {
                                    socket.wsEvent('audio_command_add_cooldown_ws', './core/commandCoolDown.js', null,
                                        ['add', commandName.val(), commandCooldown.val(), String(commandCooldownGlobal)], function() {
                                        socket.sendCommandSync('add_audio_command_cmd', 'panelloadaudiohookcmds', function() {
                                            // Reload the table
                                            run();
                                            // Close the modal.
                                            $('#add-audio-cmd').modal('toggle');
                                            // Alert the user.
                                            toastr.success('Successfully added the audio command!');
                                        });
                                    });
                                });
                            });
                        }
                }
            }).modal('toggle');
        });
    });
});