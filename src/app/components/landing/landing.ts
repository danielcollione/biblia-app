import { AfterViewInit, ChangeDetectorRef, Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, PLATFORM_ID, QueryList, signal, ViewChildren } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VersionService } from '../../services/version/version-service';
import { Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

interface Feature {
  id: string;
  title: string;
  description: string;
  tags: string[];
  isOpen: boolean;
  isVisible?: boolean;
}

@Component({
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class Landing implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('revealItem') revealItems!: QueryList<ElementRef>;
  @ViewChildren('featureContentWrapper') featureContentWrappers!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('featureContentInner') featureContentInners!: QueryList<ElementRef<HTMLElement>>;
  public ebookData = signal<any>(null);
  private readonly platformId = inject(PLATFORM_ID);

  // Computed signal que constrói dinamicamente o array de features a partir das literais
  public features = computed(() => {
    const ui = this.versionService.ui();
    return [
      {
        id: '01',
        title: ui.landingFeature01Title,
        description: ui.landingFeature01Description,
        tags: [ui.landingFeature01Tag1, ui.landingFeature01Tag2, ui.landingFeature01Tag3],
        isOpen: false,
      },
      {
        id: '02',
        title: ui.landingFeature02Title,
        description: ui.landingFeature02Description,
        tags: [ui.landingFeature02Tag1, ui.landingFeature02Tag2, ui.landingFeature02Tag3],
        isOpen: false,
      },
      {
        id: '03',
        title: ui.landingFeature03Title,
        description: ui.landingFeature03Description,
        tags: [ui.landingFeature03Tag1, ui.landingFeature03Tag2, ui.landingFeature03Tag3],
        isOpen: false,
      },
      {
        id: '04',
        title: ui.landingFeature04Title,
        description: ui.landingFeature04Description,
        tags: [ui.landingFeature04Tag1, ui.landingFeature04Tag2, ui.landingFeature04Tag3],
        isOpen: false,
      },
      {
        id: '05',
        title: ui.landingFeature05Title,
        description: ui.landingFeature05Description,
        tags: [ui.landingFeature05Tag1, ui.landingFeature05Tag2, ui.landingFeature05Tag3],
        isOpen: false,
      },
    ] as Feature[];
  });

  // State para controlar os acordeões abertos/fechados
  private featuresState = signal<Feature[]>([]);

  // Getter que retorna as features com o estado corrente
  get currentFeatures(): Feature[] {
    const state = this.featuresState();
    return state.length > 0 ? state : this.features();
  }

  constructor(
    public versionService: VersionService,
    private router: Router,
    private titleService: Title,
    private metaService: Meta,
    private httpClient: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    effect(() => {
      const lang = this.versionService.languageCode();

      // Mapeia o nome exato do arquivo para evitar erro 404
      // Se você já renomeou o arquivo .pt para -pt, pode manter apenas a segunda opção.
      const fileName = lang === 'pt' ? 'bible-ia-info.pt.json' : `bible-ia-info-${lang}.json`;

      const url = `/e-book/${fileName}`;

      this.httpClient.get(url).subscribe({
        next: (data) => this.ebookData.set(data),
        error: (err) =>
          console.error(`Erro 404: Não foi possível achar o arquivo no caminho ${url}`, err),
      });
    });
  }

  ngOnInit() {
    this.setSeoTags();

    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Quando a seção entra na tela, ativa os elementos com delay
            const elements = entry.target.querySelectorAll('.reveal-element');
            elements.forEach((el, index) => {
              setTimeout(() => {
                el.classList.add('active');
              }, index * 200); // Delay cascata entre os blocos
            });
          }
        });
      },
      { threshold: 0.2 },
    ); // Dispara quando 20% da seção estiver visível

    const target = document.querySelector('#reveal-trigger');
    if (target) observer.observe(target);
  }

  ngAfterViewInit() {
    // 1. Bloqueia a execução no Servidor (Resolve o erro do Console)
    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
      return;
    }

    // Inicializa o estado de features com os dados do computed signal
    this.featuresState.set(this.features());

    const observerOptions = {
      root: null,
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      let hasChanges = false;

      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          // Pegamos o index que passamos no HTML
          const indexStr = target.getAttribute('data-index'); 
          
          if (indexStr !== null) {
            const state = this.featuresState();
            state[Number(indexStr)].isVisible = true; // Atualiza o estado via Angular
            this.featuresState.set([...state]); // Força atualização do signal
            hasChanges = true;
          }
          observer.unobserve(target);
        }
      });

      // 2. Como o Observer roda fora do ciclo do Angular, forçamos ele a desenhar a tela
      if (hasChanges) {
        this.cdr.detectChanges();
      }
    }, observerOptions);

    this.revealItems.forEach(item => observer.observe(item.nativeElement));

    // Prepara o estado inicial fechado e sincroniza os painéis ao renderizar.
    queueMicrotask(() => this.syncFeaturePanelHeights(false));
    this.featureContentInners.changes.subscribe(() => this.syncFeaturePanelHeights(false));

    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('resize', this.handleResize);
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  toggleFeature(id: string): void {
    const state = this.featuresState();
    const updatedState = state.map((feature) => ({
      ...feature,
      isOpen: feature.id === id ? !feature.isOpen : false,
    }));
    this.featuresState.set(updatedState);

    // Força uma animação real de altura, respeitando duração longa.
    queueMicrotask(() => this.syncFeaturePanelHeights(true));
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  private readonly handleResize = () => {
    this.syncFeaturePanelHeights(false);
  };

  private syncFeaturePanelHeights(animate: boolean): void {
    if (!this.featureContentWrappers || !this.featureContentInners) {
      return;
    }

    const features = this.currentFeatures;

    this.featureContentWrappers.forEach((wrapperRef, index) => {
      const wrapper = wrapperRef.nativeElement;
      const inner = this.featureContentInners.get(index)?.nativeElement;
      const feature = features[index];

      if (!feature || !inner) {
        return;
      }

      const targetHeight = inner.scrollHeight;

      if (!animate) {
        wrapper.style.height = feature.isOpen ? `${targetHeight}px` : '0px';
        return;
      }

      if (feature.isOpen) {
        // Reflow garante que o browser capture o estado inicial antes de animar.
        const startHeight = wrapper.getBoundingClientRect().height;
        wrapper.style.height = `${startHeight}px`;
        void wrapper.offsetHeight;

        wrapper.style.height = `${targetHeight}px`;
      } else {
        const currentHeight = wrapper.getBoundingClientRect().height;
        wrapper.style.height = `${currentHeight}px`;
        void wrapper.offsetHeight;

        wrapper.style.height = '0px';
      }
    });

    this.cdr.detectChanges();
  }

  setSeoTags() {
    // Título focado em Keywords Internacionais
    this.titleService.setTitle('A Bíblia Revelada | Estudos Bíblicos Imersivos');

    // Descrição em inglês para o Google Global
    this.metaService.updateTag({
      name: 'description',
      content:
        'Uma jornada cinematográfica além das escrituras. Explore estudos bíblicos profundos, insights arqueológicos e contextos históricos antigos com uma experiência digital premium.',
    });

    // Open Graph (Facebook, LinkedIn, WhatsApp)
    this.metaService.updateTag({
      property: 'og:title',
      content: 'A Bíblia Revelada - Jornada Além das Escrituras',
    });
    this.metaService.updateTag({
      property: 'og:description',
      content: 'Revele os mistérios de manuscritos antigos e exegese histórica.',
    });
    this.metaService.updateTag({
      property: 'og:image',
      content: 'assets/images/og-main-english.jpg',
    });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });

    // Twitter Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: 'A Bíblia Revelada' });
  }

  irParaBiblia() {
    this.router.navigate(['/read']);
  }

  irParaMateriais() {
    this.router.navigate(['/materials']);
  }

  abrirLeitor() {
    // Substitua pelo seu link de pagamento real do Stripe
    const stripeUrl = 'https://pay.hotmart.com/L105521057X?checkoutMode=10';
    window.open(stripeUrl, '_blank');
  }
}
