import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AiVisionPage from './pages/AiVisionPage.jsx';
import RiskProtectionPage from './pages/RiskProtectionPage.jsx';
import PlannerPage from './pages/PlannerPage.jsx';
import RoverMonitorPage from './pages/RoverMonitorPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ProjectInfoPage from './pages/ProjectInfoPage.jsx';

import {
  INITIAL_ROVER_STATE,
} from './data/demoData.js';
import {
  runLiveYoloInference,
  checkBackendHealth,
  BACKEND_CONFIG,
} from './services/aiVisionService.js';
import {
  assessRisks,
  DEFAULT_THRESHOLDS,
} from './services/riskAssessmentService.js';

export default function App() {
  const [activePage, setActivePage] = useState('vision'); // Default to AI Vision page for immediate testing
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Calibration thresholds
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);

  // Rover telemetry digital twin state
  const [roverState, setRoverState] = useState({
    ...INITIAL_ROVER_STATE,
    connectionMode: 'Connected', // Backend is live
  });

  // Selected target for inspector highlighting
  const [selectedTargetId, setSelectedTargetId] = useState(null);

  // Inference state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 1536, height: 1024 });

  // Raw detections from the live model (starts empty until image analyzed)
  const [rawDetections, setRawDetections] = useState([]);

  // Model metadata
  const [inferenceMetadata, setInferenceMetadata] = useState({
    isDemo: false,
    source: 'LIVE_YOLOV8_BACKEND',
    modelName: 'FastAPI YOLOv8 Model',
    inferenceTimeMs: 0,
    badgeText: 'FASTAPI YOLOv8 ONLINE',
    statusMessage: `Backend active at ${BACKEND_CONFIG.predictEndpoint}. Ready for image upload.`,
  });

  // Backend live API connection status
  const [backendStatus, setBackendStatus] = useState({ connected: true, statusText: 'Online' });

  // Master detection records history
  const [detectionHistory, setDetectionHistory] = useState([]);

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then((status) => {
      setBackendStatus(status);
      if (!status.connected) {
        setApiError(`FastAPI backend at ${BACKEND_CONFIG.baseUrl} is unreachable: ${status.error}`);
      }
    });
  }, []);

  // Dynamically re-evaluate risks whenever raw detections or thresholds change
  const { records: assessedDetections, summary } = useMemo(() => {
    return assessRisks(rawDetections, thresholds);
  }, [rawDetections, thresholds]);

  // Run live YOLOv8 inference through FastAPI backend
  const handleRunInference = async ({ file, previewUri }) => {
    setIsAnalyzing(true);
    setApiError(null);

    try {
      const result = await runLiveYoloInference(file || previewUri);

      setRawDetections(result.detections || []);
      setImageDimensions({
        width: result.imageWidth,
        height: result.imageHeight,
      });

      setInferenceMetadata({
        isDemo: false,
        source: 'LIVE_YOLOV8_BACKEND',
        modelName: result.modelName || 'FastAPI YOLOv8 Live Model',
        inferenceTimeMs: result.inferenceTimeMs,
        badgeText: 'LIVE YOLOv8 DETECTIONS',
        statusMessage: `Analyzed in ${result.inferenceTimeMs}ms via ${BACKEND_CONFIG.predictEndpoint}. Found ${result.cropCount} crops, ${result.weedCount} weeds.`,
      });

      // Assess risks for newly received live detections
      const newlyAssessed = assessRisks(result.detections, thresholds);

      // Prepend newly evaluated records to master detection history
      const newHistoryEntries = newlyAssessed.records.map((r, i) => ({
        id: r.id || `YOLO-${i + 1}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        fieldZone: 'Camera Sensor 01',
        class: r.category,
        species: r.subClass || r.label,
        confidence: r.confidence,
        proximityPx: r.proximityPx,
        riskLevel: r.riskLevel,
        decisionReason: r.decisionReason,
        proposedAction: r.proposedAction,
        approvalStatus: r.category === 'crop' ? 'PROTECTED' : 'PENDING_APPROVAL',
        actionTaken: r.category === 'crop' ? 'Protected Canopy' : 'Target Identified',
        isIllustrativeSize: false,
        sizeEstCm2: r.sizeEstCm2 || 0,
      }));

      setDetectionHistory(newHistoryEntries);
    } catch (err) {
      console.error('FastAPI Backend Inference Error:', err);
      // Explicit error message, never substitute fake mock detections
      setApiError(err.message || 'Failed to process image on FastAPI backend.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Emergency Stop Trigger
  const handleEmergencyStop = () => {
    setRoverState((prev) => ({
      ...prev,
      isEmergencyStopped: true,
      operatingStatus: 'E-STOP ACTIVATED (HALTED)',
      speedMps: 0.00,
      toolArmState: 'Emergency Locked (Disarmed)',
      activeSubsystems: {
        ...prev.activeSubsystems,
        mechanicalCutter: false,
        laserModule: false,
      },
    }));
  };

  // Reset Emergency Stop
  const handleResetEmergencyStop = () => {
    setRoverState((prev) => ({
      ...prev,
      isEmergencyStopped: false,
      operatingStatus: 'Autonomous Patrol',
      speedMps: 0.42,
      toolArmState: 'Disarmed / Standby',
    }));
  };

  // Start Demo Patrol
  const handleStartDemo = () => {
    if (roverState.isEmergencyStopped) return;
    setRoverState((prev) => ({
      ...prev,
      operatingStatus: 'Autonomous Patrol (Active Traversal)',
      speedMps: 0.45,
    }));
  };

  // Pause Demo Patrol
  const handlePauseDemo = () => {
    if (roverState.isEmergencyStopped) return;
    setRoverState((prev) => ({
      ...prev,
      operatingStatus: 'Standby / Paused',
      speedMps: 0.00,
    }));
  };

  // Update target approval status in planner
  const handleUpdateApproval = (targetId, newStatus) => {
    setDetectionHistory((prev) =>
      prev.map((item) => {
        if (item.id === targetId) {
          return { ...item, approvalStatus: newStatus };
        }
        return item;
      })
    );
  };

  // Reset thresholds to engineering defaults
  const handleResetThresholds = () => {
    setThresholds(DEFAULT_THRESHOLDS);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-[#f6f8f5] flex text-stone-900 font-sans selection:bg-emerald-200 selection:text-emerald-950">
      {/* Dark Forest-Green Sidebar (its own column on desktop, overlay drawer on mobile) */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        roverState={roverState}
        setRoverState={setRoverState}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Workspace Column (fills remaining width, never underneath sidebar) */}
      <div className="flex-1 h-full min-w-0 min-h-0 flex flex-col overflow-hidden">
        {/* Sticky Top Header */}
        <Header
          activePage={activePage}
          roverState={roverState}
          onEmergencyStop={handleEmergencyStop}
          onResetEmergencyStop={handleResetEmergencyStop}
          setIsMobileOpen={setIsMobileOpen}
          backendStatus={backendStatus}
          onToggleBackendMode={() => {}}
          isLiveBackendRequested={true}
        />

        {/* Content Area (Independently scrollable) */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-5 lg:p-6 w-full max-w-full">
          {activePage === 'dashboard' && (
            <DashboardPage
              summary={summary}
              detectionRecords={detectionHistory}
              roverState={roverState}
              onNavigate={setActivePage}
              onEmergencyStop={handleEmergencyStop}
            />
          )}

          {activePage === 'vision' && (
            <AiVisionPage
              currentDetections={assessedDetections}
              onRunInference={handleRunInference}
              isAnalyzing={isAnalyzing}
              inferenceMetadata={inferenceMetadata}
              apiError={apiError}
              onClearError={() => setApiError(null)}
              imageDimensions={imageDimensions}
              selectedTargetId={selectedTargetId}
              setSelectedTargetId={setSelectedTargetId}
            />
          )}

          {activePage === 'risk' && (
            <RiskProtectionPage
              detectionRecords={assessedDetections}
              summary={summary}
              thresholds={thresholds}
              onUpdateThresholds={setThresholds}
              onResetThresholds={handleResetThresholds}
            />
          )}

          {activePage === 'planner' && (
            <PlannerPage
              detectionRecords={assessedDetections}
              onUpdateApproval={handleUpdateApproval}
              roverState={roverState}
            />
          )}

          {activePage === 'rover' && (
            <RoverMonitorPage
              roverState={roverState}
              onStartDemo={handleStartDemo}
              onPauseDemo={handlePauseDemo}
              onEmergencyStop={handleEmergencyStop}
              onResetEmergencyStop={handleResetEmergencyStop}
              onToggleConnectionMode={(mode) =>
                setRoverState((prev) => ({ ...prev, connectionMode: mode }))
              }
            />
          )}

          {activePage === 'analytics' && (
            <AnalyticsPage
              detectionRecords={detectionHistory}
              summary={summary}
            />
          )}

          {activePage === 'project' && <ProjectInfoPage />}
        </main>
      </div>
    </div>
  );
}
