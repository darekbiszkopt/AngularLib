import { Component, OnInit } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { MovieService } from './movie.service';
import { MovieInterface } from './dto/movie.response';
import { Observable, tap } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateMovieModel } from './dto/create-movie.model';
import { SPINNER_TIMEOUT } from '../../shared/constants/timeout.constants';
import { Store } from '@ngrx/store';
import * as MoviePageActions from '../../reducers/actions/movies-page.actions';
import * as MovieApiActions from '../../reducers/actions/movies-api.actions';
import { selectActiveMovie, selectAllMovies, selectMoviesTotalAmount } from '../../reducers/shared-state/state';

@Component({
  selector: 'app-movies',
  templateUrl: './movies.component.html',
  styleUrls: ['./movies.component.scss']
})
export class MoviesComponent implements OnInit {
  movies$?: Observable<MovieInterface[]>;
  movieFormGroup!: FormGroup;
  totalAmount$?: Observable<number>;
  currentMovie$?: Observable<MovieInterface | null>;
  movieId!: string;

  constructor(private readonly spinner: NgxSpinnerService, private readonly movieService: MovieService,
              private readonly fb: FormBuilder, private readonly store: Store) {
  }

  ngOnInit(): void {
    this.movies$ = this.store.select(selectAllMovies);
    this.totalAmount$ = this.store.select(selectMoviesTotalAmount);
    this.currentMovie$ = this.store.select(selectActiveMovie);
    this.initFormGroup();
    /** spinner starts on init */
    this.spinner.show()
      .then(() => {
        this.getMovies();
        this.store.dispatch(MoviePageActions.enter());

      })
      .finally(() => setTimeout(() => this.spinner.hide(), SPINNER_TIMEOUT));
  }

  initFormGroup(): void {
    this.movieFormGroup = this.fb.group({
      title: ['', Validators.required],
      amount: ['', Validators.required],
      duration: ['', Validators.required]
    });
  }

  getMovies(): void {
    this.movieService.getAllMovies()
      .subscribe({
        next: (res) => {
          this.store.dispatch(MovieApiActions.movieLoaded({ movies: res }));
        }
      });
  }

  saveMovie(): void {
    this.spinner.show()
      .then(() => {
        const movieRequest = new CreateMovieModel(
          this.movieFormGroup.get('title')?.value,
          this.movieFormGroup.get('amount')?.value,
          this.movieFormGroup.get('duration')?.value
        );

        if (!this.movieId) {
          this.createMovie(movieRequest);
        } else {
          this.updateMovie(movieRequest);
        }
      })
      .finally(() => setTimeout(() => {
        this.clearForm();
        this.spinner.hide();
      }, SPINNER_TIMEOUT));
  }

  private updateMovie(movieRequest: CreateMovieModel): void {
    this.store.dispatch(
      MoviePageActions.updateMovie({
        movieId: this.movieId,
        changes: movieRequest
      })
    );

    this.movieService.updateMovie(movieRequest, this.movieId!.toString())
      .subscribe({
        next: (res) => {
          this.getMovies();
          this.store.dispatch(MovieApiActions.movieUpdated({ movie: res }));

        }
      });
  }

  private createMovie(movieRequest: CreateMovieModel): void {
    this.store.dispatch(
      MoviePageActions.createMovie({
        movie: movieRequest
      })
    );
    this.movieService.createMovie(movieRequest)
      .subscribe({
        next: (res) => {
          this.getMovies();
          this.store.dispatch(MovieApiActions.movieCreated({ movie: res }));
        }
      });
  }

  deleteMovie(movieId: string): void {
    this.spinner.show()
      .then(() => {

          this.store.dispatch(
            MoviePageActions.deleteMovie({
              movieId: movieId
            })
          );

          this.movieService.deleteMovieById(movieId).subscribe({
            next: (res) => {
              this.getMovies();
              this.store.dispatch(MovieApiActions.movieDeleted({ movie: res }));
            }
          });
        }
      )
      .finally(() => setTimeout(() => this.spinner.hide(), SPINNER_TIMEOUT));

  }

  editMovie(movie: MovieInterface) {
    this.store.dispatch(
      MoviePageActions.selectMovie({
        movieId: movie._id
      }));
    this.movieId = movie._id;
    this.movieFormGroup.patchValue({
      title: movie.title,
      amount: movie.amount,
      duration: movie.duration
    });
  }

  clearForm() {
    this.store.dispatch(
      MoviePageActions.clearSelectedMovie()
    );
    this.movieFormGroup.reset();
    Object.keys(this.movieFormGroup.controls).forEach(
      (key) => {
        this.movieFormGroup.get(key)?.setErrors(null);
      });
    this.movieFormGroup.setErrors(null);
    this.movieId = '';
  }
}
