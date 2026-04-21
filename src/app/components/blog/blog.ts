import { Component, OnInit } from '@angular/core';
import { Article, ArticlesService } from '../../services/articles/articles';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs'; // Adicione este import
import { VersionService } from '../../services/version/version-service';

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
  ) {}

  ngOnInit(): void {
    this.articles$ = this.articleService.getArticles();
  }

  selectArticle(article: Article) {
    this.selectedArticle = article;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToList() {
    this.selectedArticle = null;
    // Força o scroll para o topo para que a lista apareça imediatamente
    window.scrollTo({ top: 0 });
  }
}
