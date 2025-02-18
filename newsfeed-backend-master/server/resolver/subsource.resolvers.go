package resolver

// This file will be automatically regenerated based on the schema, any resolver implementations
// will be copied through when generating and any unknown code will be moved to the end.
// Code generated by github.com/99designs/gqlgen version v0.17.40

import (
	"context"
	"time"

	"github.com/rnr-capital/newsfeed-backend/model"
	"github.com/rnr-capital/newsfeed-backend/server/graph/generated"
)

// DeletedAt is the resolver for the deletedAt field.
func (r *subSourceResolver) DeletedAt(ctx context.Context, obj *model.SubSource) (*time.Time, error) {
	return &obj.DeletedAt.Time, nil
}

// Source is the resolver for the source field.
func (r *subSourceResolver) Source(ctx context.Context, obj *model.SubSource) (*model.Source, error) {
	var source model.Source
	// all calls into this resolver only need id, which is already in SubSource
	// this is a perf optimization, current fix is a hot fix
	// TODO: In UI, if we request subsource -> source -> id, alernatively we can request subsource -> source_id
	//       to save query into DB (which is a lot and making DB out of connections)
	source.Id = obj.SourceID
	// r.DB.Where("id = ?", obj.SourceID).First(&source)
	return &source, nil
}

// SubSource returns generated.SubSourceResolver implementation.
func (r *Resolver) SubSource() generated.SubSourceResolver { return &subSourceResolver{r} }

type subSourceResolver struct{ *Resolver }
