import { Component, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import { VersionService } from '../../services/version/version-service';

// Tipagem baseada no seu JSON
interface EbookBenefit {
  title: string;
  description: string;
}

interface EbookIntro {
  preTitle: string;
  sectionTitle: string;
  paragraph1: string;
  paragraph2: string;
  highlightText: string;
  benefits: EbookBenefit[];
  buttonText: string;
  content: string;
  ctaText: string;
  buttonTextBuy: string;
  description: string;
  subtitle: string;
  link?: string;
}

interface Material {
  title: string;
  ebookIntro: EbookIntro;
  coverUrl: string;
}

interface MaterialAsset {
  folder: string;
  fileBase: string;
  coverFile?: string;
}

interface MaterialResponse {
  title?: string;
  'title:'?: string;
  ebookIntro: EbookIntro;
}

@Component({
  selector: 'app-materials',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './materials.html',
  styleUrls: ['./materials.scss']
})
export class MaterialsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly assetsRoot = 'e-book';

  materialsList = signal<Material[]>([]);

  constructor(
    private readonly httpClient: HttpClient,
    public readonly versionService: VersionService,
  ) {}

  ngOnInit(): void {
    this.versionService.activeVersion$
      .pipe(
        map((version) => version.id.split('_')[0]),
        distinctUntilChanged(),
        switchMap((languageCode) => this.loadMaterials(languageCode)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((materials) => {
        this.materialsList.set(materials);
      });
  }

  private loadMaterials(languageCode: string) {
    return this.loadAssetsIndex().pipe(
      switchMap((assets) => {
        if (!assets.length) {
          return of([] as Material[]);
        }

        return forkJoin(
          assets.map((asset) => {
            const coverFile = asset.coverFile ?? 'cover.png';
            const coverUrl = `${this.assetsRoot}/${asset.folder}/${coverFile}`;
            const urls = this.buildMaterialUrls(asset, languageCode);

            return this.loadMaterialFromCandidates(urls).pipe(
              map((response) => this.normalizeMaterial(response, coverUrl)),
              catchError((error) => {
                console.error(`Nao foi possivel carregar o material (${urls.join(' | ')})`, error);
                return of(null);
              }),
            );
          }),
        ).pipe(map((materials) => materials.filter((material): material is Material => material !== null)));
      }),
      catchError((error) => {
        console.error('Nao foi possivel carregar o indice de materiais', error);
        return of([] as Material[]);
      }),
    );
  }

  private loadAssetsIndex() {
    const relativeUrl = `${this.assetsRoot}/index.json`;
    const absoluteUrl = `/${this.assetsRoot}/index.json`;

    return this.httpClient.get<MaterialAsset[]>(relativeUrl).pipe(
      catchError(() => this.httpClient.get<MaterialAsset[]>(absoluteUrl)),
    );
  }

  private buildMaterialUrls(asset: MaterialAsset, languageCode: string): string[] {
    const dashed = `${this.assetsRoot}/${asset.folder}/${asset.fileBase}-${languageCode}.json`;

    if (languageCode === 'pt') {
      const dotted = `${this.assetsRoot}/${asset.folder}/${asset.fileBase}.pt.json`;
      return [dashed, dotted];
    }

    return [dashed];
  }

  private loadMaterialFromCandidates(urls: string[]) {
    const [firstUrl, fallbackUrl] = urls;

    if (!fallbackUrl) {
      return this.httpClient.get<MaterialResponse>(firstUrl);
    }

    return this.httpClient.get<MaterialResponse>(firstUrl).pipe(
      catchError(() => this.httpClient.get<MaterialResponse>(fallbackUrl)),
    );
  }

  openLink(url: string | undefined): void {
    if (isPlatformBrowser(this.platformId) && url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  private normalizeMaterial(response: MaterialResponse, coverUrl: string): Material {
    return {
      title: response.title ?? response['title:'] ?? 'Material sem titulo',
      ebookIntro: response.ebookIntro,
      coverUrl,
    };
  }
}