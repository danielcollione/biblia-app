declare module 'romcal' {
  // Adicionamos a palavra 'default' aqui:
  export default class Romcal {
    constructor(options?: any);
    generateCalendar(year: number): Promise<any>;
  }
  
  export interface LiturgicalDay {
    date: string;
    name: string;
    colors: string[];
    rank: string;
    [key: string]: any;
  }
}