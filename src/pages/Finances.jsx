import React from 'react';
import Card from '../components/common/Card';
import { PieChart, Download } from 'lucide-react';
import Button from '../components/common/Button';

const Finances = () => {
  return (
    <div>
      <div className="d-flex justify-between align-center mb-4">
        <h1>Gestión Financiera</h1>
        <Button variant="outline" icon={<Download size={16} />}>Exportar Reporte</Button>
      </div>
      <Card>
        <div className="d-flex align-center gap-3">
          <PieChart size={32} color="var(--color-primary)" />
          <div>
            <h3>Módulo de Finanzas</h3>
            <p>Registro de diezmos, ofrendas y gastos con reportes en PDF/Excel.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
export default Finances;
