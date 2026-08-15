import { globalPluginRegistry } from '../core/kernel/plugin-registry';
import { moodPluginManifest, registerMoodPlugin } from './patient/plugin-mood';
import { aiCompanionManifest, registerAICompanionPlugin } from './patient/plugin-ai-companion';
import { clinicalNotesManifest, registerClinicalNotesPlugin } from './therapist/plugin-clinical-notes';
import { aiCopilotManifest, registerAICopilotPlugin } from './therapist/plugin-ai-copilot';
import { todayDashboardManifest, registerTodayDashboardPlugin } from './therapist/plugin-today-dashboard';
import { patientTimelineManifest, registerPatientTimelinePlugin } from './therapist/plugin-patient-timeline';
import { patientListManifest, registerPatientListPlugin } from './common/plugin-patient-list';
import { patientRegistryManifest, registerPatientRegistryPlugin } from './reception/plugin-patient-registry';
import { schedulingManifest, registerSchedulingPlugin } from './reception/plugin-scheduling';

export function initializePluginEcosystem() {
  // Register Patient Plugins
  globalPluginRegistry.registerPlugin({
    manifest: moodPluginManifest,
    registerComponents: registerMoodPlugin,
  });

  globalPluginRegistry.registerPlugin({
    manifest: aiCompanionManifest,
    registerComponents: registerAICompanionPlugin,
  });

  // Register Therapist Plugins
  globalPluginRegistry.registerPlugin({
    manifest: todayDashboardManifest,
    registerComponents: registerTodayDashboardPlugin,
  });

  globalPluginRegistry.registerPlugin({
    manifest: clinicalNotesManifest,
    registerComponents: registerClinicalNotesPlugin,
  });

  globalPluginRegistry.registerPlugin({
    manifest: aiCopilotManifest,
    registerComponents: registerAICopilotPlugin,
  });

  globalPluginRegistry.registerPlugin({
    manifest: patientTimelineManifest,
    registerComponents: registerPatientTimelinePlugin,
  });

  // Register Common & Overview Plugins
  globalPluginRegistry.registerPlugin({
    manifest: patientListManifest,
    registerComponents: registerPatientListPlugin,
  });

  // Register Receptionist Plugins
  globalPluginRegistry.registerPlugin({
    manifest: patientRegistryManifest,
    registerComponents: registerPatientRegistryPlugin,
  });

  globalPluginRegistry.registerPlugin({
    manifest: schedulingManifest,
    registerComponents: registerSchedulingPlugin,
  });
}
