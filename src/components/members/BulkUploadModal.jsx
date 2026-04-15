import React, { useState, useRef } from 'react';
import { Download, Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { createMember, getMembers, updateMember } from '../../services/memberService';
import { collection, addDoc } from 'firebase/firestore'; 
import { db } from '../../services/firebase';

const BulkUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [dataPreview, setDataPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stage, setStage] = useState('upload'); // upload | preview | log
  const fileInputRef = useRef(null);

  const EXPECTED_COLUMNS = [
    'DNI', 'Nombres', 'Apellidos_c', 'Nombre Completo', 
    'Fecha_de_Nacimiento', 'Edad_c', 'Celular_c', 'Email_c', 
    'Domicilio_c', 'Activo_c', 'Etapa_c', 'Bautismo', 
    'Firmo_Mem', 'Grupo_de_Amistad_r.Name', 'Observaciones'
  ];

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + EXPECTED_COLUMNS.join(";") + '\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_miembros_iea.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const parseCSV = (text) => {
    const separator = (text.indexOf(';') > -1 && (text.indexOf(',') === -1 || text.indexOf(';') < text.indexOf(','))) ? ';' : ',';
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const row = [];
      let currentWord = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
           row.push(currentWord.trim());
           currentWord = '';
        } else {
           currentWord += char;
        }
      }
      row.push(currentWord.trim());
      return row;
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
       setFile(selectedFile);
       const reader = new FileReader();
       reader.onload = (event) => {
          const content = event.target.result;
          const parsed = parseCSV(content);
          if (parsed.length > 1) { // has headers and at least 1 row
             const headers = parsed[0];
             const rows = parsed.slice(1);
             const previewObj = rows.map(row => {
               const obj = {};
               headers.forEach((header, index) => {
                 obj[header] = row[index] || '';
               });
               return obj;
             });
             setDataPreview(previewObj);
             setStage('preview');
          } else {
             alert('El archivo CSV está vacío o no tiene un formato válido.');
          }
       };
       reader.readAsText(selectedFile, 'UTF-8');
    }
  };

  const addLogMessage = (message, type = 'info') => {
      const newLog = { message, type, time: new Date().toLocaleTimeString() };
      setLogs(prev => [...prev, newLog]);
  };

  const processImport = async () => {
    setLoading(true);
    setLogs([]);
    setStage('log');
    addLogMessage("Iniciando análisis y carga de datos...");
    
    try {
        const existingMembers = await getMembers();
        
        let addedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < dataPreview.length; i++) {
            const row = dataPreview[i];
            
            // Helper robusto para variaciones de nombres de columnas
            const getKey = (str) => Object.keys(row).find(k => k.toLowerCase().includes(str.toLowerCase()));

            const dniKey = getKey('DNI');
            const namesKey = getKey('Nombres');
            const lastNamesKey = getKey('Apellidos');
            const phoneKey = getKey('Celular');
            const emailKey = getKey('Email');
            const groupKey = getKey('Grupo_de_Amistad');
            const addressKey = getKey('Domicilio');
            const ageKey = getKey('Edad');
            const activeKey = getKey('Activo');
            const observationsKey = getKey('Observacio');
            const stageKey = getKey('Etapa');
            const baptismKey = getKey('Bautismo');

            const firstName = namesKey ? row[namesKey] : '';
            const lastName = lastNamesKey ? row[lastNamesKey] : '';
            const dni = dniKey ? row[dniKey] : '';
            const phone = phoneKey ? row[phoneKey] : '';
            const email = emailKey ? row[emailKey] : '';
            const group = groupKey ? row[groupKey] : '';
            const address = addressKey ? row[addressKey] : '';

            if (!firstName && !lastName) {
               addLogMessage(`Fila ${i + 1}: Omitida - Falta nombre y apellido.`, 'warning');
               errorCount++;
               continue;
            }

            // Identificar si existe por DNI o por Nombre Completo
            const match = existingMembers.find(m => 
                (dni && m.dni === dni) || 
                (m.firstName === firstName && m.lastName === lastName)
            );

            // Preparar objeto de miembro. Adaptar campos al esquema existente.
            const memberData = {
               firstName,
               lastName,
               dni, 

               phone,
               email,
               group,
               address,
               extraData: {
                   age: ageKey ? row[ageKey] : '',
                   active: activeKey ? row[activeKey] : '',
                   stage: stageKey ? row[stageKey] : '',
                   baptism: baptismKey ? row[baptismKey] : '',
               },
               notes: observationsKey ? row[observationsKey] : '',
               updatedViaCSV: true
            };

            // Registro de modificaciones en base de datos ("deberá quedar registro de modificaciones que se hagan sobre el mismo")
            const historyLog = {
                action: match ? 'UPDATE' : 'CREATE',
                timestamp: new Date().toISOString(),
                method: 'CSV Upload',
                snapshot: memberData
            };

            if (match) {
                const history = match.history || [];
                await updateMember(match.id, { 
                    ...memberData, 
                    history: [...history, historyLog] 
                });
                addLogMessage(`[ACUALIZADO] ${firstName} ${lastName}`);
                updatedCount++;
            } else {
                await createMember({ 
                    ...memberData, 
                    growthPath: {},
                    history: [historyLog]
                });
                addLogMessage(`[CREADO] ${firstName} ${lastName}`);
                addedCount++;
            }
        }

        // Global Action Log
        try {
            await addDoc(collection(db, 'system_logs'), {
                module: 'Members',
                action: 'NUEVA_CARGA_MASIVA_CSV',
                details: `Importados: ${addedCount}, Actualizados: ${updatedCount}`,
                timestamp: new Date()
            });
        } catch(e) {} // fail silently for logs

        addLogMessage(`Proceso finalizado. Creados: ${addedCount} | Actualizados: ${updatedCount} | Omitidos: ${errorCount}`, 'success');
        
        if (addedCount > 0 || updatedCount > 0) {
            onSuccess(); // Actualiza la lista en Members.jsx
        }
    } catch (error) {
        console.error("Error en importación masiva", error);
        addLogMessage("Ocurrió un error grave al importar los datos.", 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleReset = () => {
      setFile(null);
      setDataPreview([]);
      setLogs([]);
      setStage('upload');
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal isOpen={isOpen} onClose={(!loading && stage !== 'log') ? onClose : undefined} title="Carga Masiva de Miembros">
        {stage === 'upload' && (
            <div className="d-flex flex-col align-center p-4">
                <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
                    Exporta desde Excel o tu sistema actual con las siguientes columnas y sube el archivo .CSV separador por comas o punto y coma.
                </p>
                
                <div style={{ backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: '8px', width: '100%', marginBottom: '1.5rem' }}>
                    <div className="d-flex justify-between align-center mb-2">
                        <h4 style={{ margin: 0, fontWeight: 500 }}>Modelo Requerido</h4>
                        <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={handleDownloadTemplate}>
                            Descargar Modelo
                        </Button>
                    </div>
                    <code style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', wordWrap: 'break-word', padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: '4px' }}>
                        {EXPECTED_COLUMNS.join(' ; ')}
                    </code>
                </div>

                <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: '2px dashed var(--color-border)',
                        borderRadius: '12px',
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        width: '100%',
                        transition: 'border-color 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                    <Upload size={32} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem' }} />
                    <div style={{ fontWeight: 500 }}>Haz clic para seleccionar tu archivo CSV</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                        Soportado: .csv
                    </div>
                </div>
                <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange} 
                />
            </div>
        )}

        {stage === 'preview' && (
            <div>
                <p style={{ marginBottom: '1rem' }}>
                    Se han detectado <strong>{dataPreview.length}</strong> registros listos para importar.
                    A continuación se muestra una vista previa:
                </p>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--color-surface)' }}>
                            <tr>
                                {Object.keys(dataPreview[0] || {}).slice(0, 5).map((col, idx) => (
                                    <th key={idx} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>{col}</th>
                                ))}
                                {Object.keys(dataPreview[0] || {}).length > 5 && (
                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>...</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {dataPreview.slice(0, 5).map((row, rIdx) => (
                                <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {Object.values(row).slice(0, 5).map((val, cIdx) => (
                                        <td key={cIdx} style={{ padding: '0.75rem' }}>{val}</td>
                                    ))}
                                    {Object.values(row).length > 5 && <td style={{ padding: '0.75rem' }}>...</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="d-flex justify-end gap-2">
                    <Button variant="outline" onClick={handleReset}>Cancelar</Button>
                    <Button onClick={processImport} disabled={loading} icon={<Upload size={16} />}>
                        Confirmar Importación
                    </Button>
                </div>
            </div>
        )}

        {stage === 'log' && (
            <div>
                <h4 style={{ marginBottom: '1rem' }}>Registro de Operaciones</h4>
                <div style={{ backgroundColor: 'var(--color-bg)', padding: '1rem', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {logs.map((log, idx) => (
                        <div key={idx} style={{ 
                            padding: '0.25rem 0', 
                            color: log.type === 'error' ? 'var(--color-danger)' : 
                                   log.type === 'success' ? 'var(--color-success)' : 
                                   log.type === 'warning' ? '#f5a623' : 'var(--color-text)' 
                        }}>
                            <span style={{ opacity: 0.5, marginRight: '0.5rem' }}>[{log.time}]</span>
                            {log.message}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ padding: '0.5rem 0', color: 'var(--color-primary)' }}>Procesando...</div>
                    )}
                </div>
                {!loading && (
                    <div className="d-flex justify-end gap-2">
                        <Button variant="outline" onClick={handleReset}>Subir Otro Archivo</Button>
                        <Button onClick={onClose} icon={<CheckCircle size={16}/>}>Finalizar y Cerrar</Button>
                    </div>
                )}
            </div>
        )}
    </Modal>
  );
};

export default BulkUploadModal;
