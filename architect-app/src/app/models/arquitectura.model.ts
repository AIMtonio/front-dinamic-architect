export type TipoComponente = 'eks' | 'lambda' | 'fargate' | 'ec2';

export interface ComponenteItem {
  nombre: string;
  tipo: TipoComponente;
}

export interface Arquitectura {
  componentes: string[];
  tipo: TipoComponente[];
}
