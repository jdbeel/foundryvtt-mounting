// SPDX-FileCopyrightText: 2022 Johannes Loher
//
// SPDX-License-Identifier: MIT

/**
 * This is your TypeScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your module, or remove it.
 * Author: Jacob Beel
 * Content License: Copyright 2022 Jacob Beel
 * Software License: GNU-GPL v3
 */

// Import TypeScript modules
import { registerSettings } from './settings';
import { preloadTemplates } from './preloadTemplates';
import { MountingHud } from './hud';

import { MODULE_ID } from './const';

// Initialize module
Hooks.once('init', async () => {
    const MODULE_ID = 'foundryvtt-mounting';
    console.log(`${MODULE_ID} | Initializing foundryvtt-mounting.`);

    // Assign custom classes and constants here

    // Register custom module settings
    registerSettings();

    // Preload Handlebars templates
    await preloadTemplates();

    // Register custom sheets (if any)
});

// Setup module
Hooks.once('setup', async () => {
    // Do anything after initialization but before
    // ready
});

// When ready
// Hooks.once('ready', async () => {

// });

Hooks.on('renderTokenHUD', async (app: TokenHUD, html: JQuery, data: any) => {
    MountingHud.render(app, html, data);
});

// Add any additional hooks if necessary
