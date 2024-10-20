import { Service } from '../models/Service';
import manicureImg from '../assets/images/home/motoo.jpg';
import pedicureImg from '../assets/images/home/trabajo1.jpg';
import botoxImg from '../assets/images/home/trabajo2.jpg';
import alisadoImg from '../assets/images/home/trabajo3.jpg';

export class HomeViewModel {
  constructor() {
    this.services = [
      new Service(1, 'Manicure', 'Mejora el aspecto de tus uñas con nuestras técnicas modernas.', manicureImg, '/manicure'),
      new Service(2, 'Pedicure', 'Cuida tus pies y uñas con nuestros tratamientos especiales.', pedicureImg, '/pedicure'),
      new Service(3, 'Botox Capilar', 'Repara y revitaliza tu cabello con un tratamiento de botox capilar.', botoxImg, '/botox-capilar'),
      new Service(4, 'Alisado Permanente', 'Consigue un alisado perfecto y duradero.', alisadoImg, '/alisado-permanente'),
    ];
  }

  getServices() {
    return this.services;
  }
}
