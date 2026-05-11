import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  QueryList,
  signal,
  ViewChild,
  ViewChildren,
} from '@angular/core';
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

interface FAQ {
  question: string;
  answer: string;
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
  @ViewChildren('featureContentWrapper') featureContentWrappers!: QueryList<
    ElementRef<HTMLElement>
  >;
  @ViewChildren('featureContentInner') featureContentInners!: QueryList<ElementRef<HTMLElement>>;
  public ebookData = signal<any>(null);
  private readonly platformId = inject(PLATFORM_ID);

  // Signal para controlar quais FAQs estão abertos
  private faqsOpenState = signal<boolean[]>([false, false, false, false, false, false]);

  // Signal para rastrear visibilidade dos FAQs (para animação de scroll)
  private faqsVisibilityState = signal<boolean[]>([false, false, false, false, false, false]);

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

  @ViewChild('featuresGrid') featuresGrid!: ElementRef;

  // Variável que o HTML está escutando para aplicar a classe .visible
  isFeaturesVisible = false;

  private observer: IntersectionObserver | undefined;

  faqs: FAQ[] = [];

  constructor(
    public versionService: VersionService,
    private router: Router,
    private titleService: Title,
    private metaService: Meta,
    private httpClient: HttpClient,
    private cdr: ChangeDetectorRef,
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

  toggleFaq(index: number): void {
    // Fecha todos os outros antes de abrir o atual (opcional, estilo sanfona)
    // this.faqs.forEach((faq, i) => { if (i !== index) faq.isOpen = false; });

    // Alterna o estado da pergunta clicada
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }

  getFaqs() {
    return [
      {
        question: this.versionService.ui().landingFaqItem1Question,
        answer: this.versionService.ui().landingFaqItem1Answer,
        isOpen: false,
        isVisible: false,
      },
      {
        question: this.versionService.ui().landingFaqItem2Question,
        answer: this.versionService.ui().landingFaqItem2Answer,
        isOpen: false,
        isVisible: false,
      },
      {
        question: this.versionService.ui().landingFaqItem3Question,
        answer: this.versionService.ui().landingFaqItem3Answer,
        isOpen: false,
        isVisible: false,
      },
      {
        question: this.versionService.ui().landingFaqItem4Question,
        answer: this.versionService.ui().landingFaqItem4Answer,
        isOpen: false,
        isVisible: false,
      },
      {
        question: this.versionService.ui().landingFaqItem5Question,
        answer: this.versionService.ui().landingFaqItem5Answer,
        isOpen: false,
        isVisible: false,
      },
      {
        question: this.versionService.ui().landingFaqItem6Question,
        answer: this.versionService.ui().landingFaqItem6Answer,
        isOpen: false,
        isVisible: false,
      },
    ];
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

    this.faqs = this.getFaqs();
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
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      let hasChanges = false;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          const indexStr = target.getAttribute('data-index');
          const dataType = target.getAttribute('data-type');

          if (indexStr !== null) {
            if (dataType === 'faq') {
              // Atualiza visibilidade do FAQ
              const state = this.faqsVisibilityState();
              state[Number(indexStr)] = true;
              this.faqsVisibilityState.set([...state]);
            } else {
              // Atualiza visibilidade da feature
              const state = this.featuresState();
              state[Number(indexStr)].isVisible = true;
              this.featuresState.set([...state]);
            }
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

    this.revealItems.forEach((item) => observer.observe(item.nativeElement));

    // Prepara o estado inicial fechado e sincroniza os painéis ao renderizar.
    queueMicrotask(() => this.syncFeaturePanelHeights(false));
    this.featureContentInners.changes.subscribe(() => this.syncFeaturePanelHeights(false));

    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('resize', this.handleResize);
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Quando a seção entra na tela, mudamos para true
            this.isFeaturesVisible = true;

            // Força o Angular a atualizar a tela imediatamente
            this.cdr.detectChanges();

            // Opcional: Desconecta o observer para a animação acontecer só 1 vez
            this.observer?.disconnect();
          }
        });
      },
      {
        threshold: 0.1, // Dispara quando 10% da seção aparecer na tela
      },
    );

    if (this.featuresGrid) {
      this.observer.observe(this.featuresGrid.nativeElement);
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  toggleFeature(id: string): void {
    const state = this.featuresState();
    const previousState = state.map((feature) => ({ ...feature }));
    const featureIndex = state.findIndex((feature) => feature.id === id);

    if (featureIndex < 0) {
      return;
    }

    const updatedState = [...state];
    const targetFeature = state[featureIndex];
    updatedState[featureIndex] = {
      ...targetFeature,
      isOpen: !targetFeature.isOpen,
    };

    this.featuresState.set(updatedState);

    // Força uma animação real de altura, respeitando duração longa.
    queueMicrotask(() => this.syncFeaturePanelHeights(true, previousState));
  }

  trackFeature(_: number, feature: Feature): string {
    return feature.id;
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.handleResize);
    }

    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private readonly handleResize = () => {
    this.syncFeaturePanelHeights(false);
  };

  private syncFeaturePanelHeights(animate: boolean, previousState: Feature[] = []): void {
    if (!this.featureContentWrappers || !this.featureContentInners) {
      return;
    }

    const features = this.currentFeatures;

    this.featureContentWrappers.forEach((wrapperRef, index) => {
      const wrapper = wrapperRef.nativeElement;
      const inner = this.featureContentInners.get(index)?.nativeElement;
      const feature = features[index];
      const previousFeature = previousState[index];

      if (!feature || !inner) {
        return;
      }

      const targetHeight = inner.scrollHeight;
      const currentHeight = wrapper.getBoundingClientRect().height;

      if (!animate) {
        wrapper.style.height = feature.isOpen ? `${targetHeight}px` : '0px';
        return;
      }

      if (previousFeature && previousFeature.isOpen === feature.isOpen) {
        wrapper.style.height = feature.isOpen ? `${targetHeight}px` : '0px';
        return;
      }

      if (feature.isOpen) {
        // Reflow garante que o browser capture o estado inicial antes de animar.
        const startHeight = currentHeight;
        wrapper.style.height = `${startHeight}px`;
        void wrapper.offsetHeight;

        requestAnimationFrame(() => {
          wrapper.style.height = `${targetHeight}px`;
        });
      } else {
        wrapper.style.height = `${currentHeight || targetHeight}px`;
        void wrapper.offsetHeight;

        requestAnimationFrame(() => {
          wrapper.style.height = '0px';
        });
      }
    });

    this.cdr.detectChanges();
  }

  setSeoTags() {
    // Título focado em Keywords Internacionais
    this.titleService.setTitle('The Unveiled Bible | Immersive Biblical Studies');

    // Descrição em inglês para o Google Global
    this.metaService.updateTag({
      name: 'description',
      content:
        'A cinematic journey beyond the scripture. Explore deep biblical studies, archaeological insights, and ancient historical contexts with a premium digital experience.',
    });

    // Open Graph (Facebook, LinkedIn, WhatsApp)
    this.metaService.updateTag({
      property: 'og:title',
      content: 'The Unveiled Bible - Journey Beyond the Writing',
    });
    this.metaService.updateTag({
      property: 'og:description',
      content: 'Unveil the mysteries of ancient manuscripts and historical exegesis.',
    });
    this.metaService.updateTag({
      property: 'og:image',
      content: 'assets/images/og-main-english.jpg',
    });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });

    // Twitter Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: 'The Unveiled Bible' });
  }

  irParaBiblia() {
    this.router.navigate(['/read']);
  }

  irParaMateriais() {
    this.router.navigate(['/materials']);
  }

  abrirLeitor() {
    const stripeUrl = 'https://theunveiledbible.gumroad.com/l/bible-in-the-age-of-ai';
    window.open(stripeUrl, '_blank');
  }
}
