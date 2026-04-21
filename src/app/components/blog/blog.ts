import { Component, OnInit } from '@angular/core';
import { Article, ArticlesService } from '../../services/articles/articles';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs'; // Adicione este import
import { VersionService } from '../../services/version/version-service';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-blog',
  standalone: true, // Adicionado para garantir o funcionamento do CommonModule
  imports: [CommonModule],
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
})
export class Blog implements OnInit {
  articles$: Observable<Article[]> | undefined;
  selectedArticle: Article | null = null;

  constructor(
    private articleService: ArticlesService,
    public versionService: VersionService,
    private titleService: Title,
    private metaService: Meta,
  ) {}

  ngOnInit(): void {
    this.articles$ = this.articleService.getArticles();
  }

  selectArticle(article: Article) {
    this.selectedArticle = article;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.titleService.setTitle(`${article.title} | The Unveiled Bible`);

    // Atualiza as Meta Tags para Google e Redes Sociais
    this.metaService.updateTag({ name: 'description', content: article.excerpt });
    this.metaService.updateTag({ property: 'og:title', content: article.title });
    this.metaService.updateTag({ property: 'og:description', content: article.excerpt });
    this.metaService.updateTag({ property: 'og:image', content: article.thumbnail });
    this.metaService.updateTag({
      property: 'og:url',
      content: `https://theunveiledbible.com/blog/${article.id}`,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToList() {
    this.selectedArticle = null;
    // Força o scroll para o topo para que a lista apareça imediatamente
    window.scrollTo({ top: 0 });
  }
}
